import { requireSocial } from '@/lib/auth';
import { getDriveAuth } from '@/lib/drive';
import { getSessionCookie } from '@/lib/auth';
import { Readable } from 'node:stream';
import { NextRequest,NextResponse } from 'next/server';
import { google } from 'googleapis';



export async function POST(req: NextRequest) {
  try {
    await requireSocial();
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const channel = (formData.get('channel') as string) || '';
    
    if (!file || file.size <= 0 || file.size > 2 * 1024 ** 3) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      return NextResponse.json({ success: false, error: 'Google Drive folder ID is not configured' }, { status: 500 });
    }

    // Get uploader info from session cookie
    let uploaderName = 'Unknown';
    let uploaderId = '';
    let uploaderEmail = '';
    try {
      const sessionCookie = (await getSessionCookie());
      if (sessionCookie) {
        const user = sessionCookie.user;
        uploaderName = user.name || 'Unknown';
        uploaderId = user.id || '';
        uploaderEmail = user.email || '';
      }
    } catch {}

    const auth = await getDriveAuth();
    const drive = google.drive({ version: 'v3', auth });

    // Stream the file directly to avoid memory limits for large files (up to 2GB)
    
    let stream;
    if (typeof file.stream === 'function') {
      stream = Readable.fromWeb(file.stream() as import('node:stream/web').ReadableStream);
    } else {
      // Fallback if file.stream() is not available for some reason
      const arrayBuffer = await file.arrayBuffer();
      stream = Readable.from(Buffer.from(arrayBuffer));
    }

    // Determine file category from mime type
    let fileType = 'Other';
    if (file.type.includes('image')) fileType = 'Image';
    else if (file.type.includes('video')) fileType = 'Video';
    else if (file.type.includes('pdf')) fileType = 'PDF';
    else if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.type.includes('csv')) fileType = 'Spreadsheet';
    else if (file.type.includes('document') || file.type.includes('word')) fileType = 'Document';

    const res = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
        description: `Uploaded by ${uploaderName}`,
        appProperties: {
          uploadedBy: uploaderName,
          uploaderId: uploaderId,
          uploaderEmail: uploaderEmail,
          channel: channel,
          fileType: fileType,
        }
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: 'id, name, webViewLink, webContentLink, mimeType, createdTime, size, appProperties',
    });

    return NextResponse.json({ success: true, file: res.data });
  } catch (error) {
    console.error('Error uploading to drive in API:', error);
    return NextResponse.json({ success: false, error: (error instanceof Error ? error.message : String(error)) || 'Failed to upload file' }, { status: 500 });
  }
}
