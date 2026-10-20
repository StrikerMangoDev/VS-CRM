'use server'
import { randomInt } from 'node:crypto'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { consumeAttempt,cookieOptions,createSession,tokenHash } from '@/lib/auth'

const emailFrom = (form: FormData) => String(form.get('email') || '').trim().toLowerCase()
export async function loginAction(formData: FormData) {
  const email = emailFrom(formData)
  const password = String(formData.get('password') || '')
  if (!email || !password) return { error: 'Email and password are required' }
  if (!await consumeAttempt('login:' + tokenHash(email), 10, 900)) return { error: 'Too many attempts. Please try again later.' }
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, password: true, isActive: true },
  })
  if (!user?.password || !user.isActive || !await bcrypt.compare(password, user.password)) return { error: 'Invalid email or password' }
  await createSession(user.id)
  return { success: true }
}
export async function logoutAction() {
  const store = await cookies()
  const token = store.get('vscrm_session')?.value
  if (token) await prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } })
  store.set('vscrm_session', '', { ...cookieOptions, maxAge: 0 })
  return { success: true }
}
export async function sendResetOtp(formData: FormData): Promise<{ success?: boolean; error?: string; previewUrl?: string }> {
  const email = emailFrom(formData)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'A valid email is required' }
  if (!await consumeAttempt('reset-send:' + tokenHash(email), 3, 3600)) return { error: 'Too many requests. Please try again later.' }
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) return { error: 'Password recovery email is not configured. Please contact an administrator.' }
  const result = { success: true, previewUrl: undefined }
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, isActive: true }, select: { id: true, email: true } })
  if (!user) return result
  const otp = randomInt(100000, 1000000).toString()
  const hashedOtp = await bcrypt.hash(otp, 10)
  await prisma.user.update({ where: { id: user.id }, data: { resetToken: hashedOtp, resetTokenExpiry: new Date(Date.now() + 900000) } })
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true', requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false',
      ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } : {}),
    })
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: user.email, subject: 'Password Reset OTP', text: `Your password reset OTP is: ${otp}. It expires in 15 minutes.` })
  } catch {
    await prisma.user.updateMany({ where: { id: user.id, resetToken: hashedOtp }, data: { resetToken: null, resetTokenExpiry: null } })
    // Keep the response identical for registered and unregistered addresses.
  }
  return result
}
export async function resetPassword(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const email = emailFrom(formData), otp = String(formData.get('otp') || ''), newPassword = String(formData.get('newPassword') || '')
  if (!email || !/^\d{6}$/.test(otp) || newPassword.length < 6 || newPassword.length > 72) return { error: 'Enter a valid OTP and a password of 6 to 72 characters' }
  if (!await consumeAttempt('reset-verify:' + tokenHash(email), 5, 900)) return { error: 'Too many attempts. Please request a new OTP later.' }
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, isActive: true },
    select: { id: true, resetToken: true, resetTokenExpiry: true },
  })
  if (!user?.resetToken || !user.resetTokenExpiry || user.resetTokenExpiry <= new Date() || !await bcrypt.compare(otp, user.resetToken)) return { error: 'Invalid or expired OTP' }
  const password = await bcrypt.hash(newPassword, 10)
  return prisma.$transaction(async tx => {
    const updated = await tx.user.updateMany({
      where: { id: user.id, resetToken: user.resetToken, resetTokenExpiry: { gt: new Date() } },
      data: { password, resetToken: null, resetTokenExpiry: null },
    })
    if (!updated.count) return { error: 'Invalid or expired OTP' }
    await tx.session.deleteMany({ where: { userId: user.id } })
    return { success: true }
  })
}
