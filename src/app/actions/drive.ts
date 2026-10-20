'use server'
import { getDriveAuth } from '@/lib/drive';

import { requireRoles,requireSocial } from '@/lib/auth';
import { getSessionCookie } from '@/lib/auth';


import { google } from 'googleapis';
import { headers } from 'next/headers';



export async function getDriveUploadUrlAction(fileName: string, mimeType: string, fileSize: number, channel: string) {
  await requireSocial();

  if (typeof fileName !== 'string' || !fileName.trim() || !Number.isFinite(fileSize) || fileSize <= 0 || fileSize > 2 * 1024 ** 3 || typeof mimeType !== 'string') return { success: false, error: 'Invalid file' };
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      throw new Error('Google Drive folder ID is not configured');
    }

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
    const accessToken = (await auth.getAccessToken()).token;
    
    if (!accessToken) {
      throw new Error('Failed to retrieve access token for Google Drive');
    }

    let fileType = 'Other';
    if (mimeType.includes('image')) fileType = 'Image';
    else if (mimeType.includes('video')) fileType = 'Video';
    else if (mimeType.includes('pdf')) fileType = 'PDF';
    else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) fileType = 'Spreadsheet';
    else if (mimeType.includes('document') || mimeType.includes('word')) fileType = 'Document';

    const metadata = {
      name: fileName,
      parents: [folderId],
      description: `Uploaded by ${uploaderName}`,
      appProperties: {
        uploadedBy: uploaderName,
        uploaderId: uploaderId,
        uploaderEmail: uploaderEmail,
        channel: channel,
        fileType: fileType,
      }
    };

    const url = `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,webContentLink,mimeType,createdTime,size,appProperties`;

    const headersList = await headers();
    let origin = 'http://localhost:3000';
    try {
      const ref = headersList.get('referer');
      origin = headersList.get('origin') || (ref ? new URL(ref).origin : 'http://localhost:3000');
    } catch {}

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': fileSize.toString(),
        'Origin': origin
      },
      body: JSON.stringify(metadata)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to initiate resumable upload session: ${res.statusText} - ${errText}`);
    }

    const location = res.headers.get('location');
    if (!location) {
      throw new Error('No resumable upload URL returned from Google Drive');
    }

    return { success: true, uploadUrl: location };
  } catch (error) {
    console.error('Error in getDriveUploadUrlAction:', error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || 'Failed to initiate upload session' };
  }
}

export async function listDriveFilesAction() {
  await requireRoles("ADMIN");

  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) throw new Error('Google Drive folder ID is not configured');

    const auth = await getDriveAuth();
    const drive = google.drive({ version: 'v3', auth });

    const files: import('googleapis').drive_v3.Schema$File[] = [];
    let pageToken: string | undefined;
    do {
    const res = await drive.files.list({
      pageSize: 1000, pageToken,
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken,files(id, name, webViewLink, webContentLink, mimeType, createdTime, size, appProperties, thumbnailLink, hasThumbnail)',
      orderBy: 'createdTime desc'
    });

    files.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);
    return { success: true, files: files.filter(file=>file.id).map(file=>({...file,id:file.id!,name:file.name||'',mimeType:file.mimeType||'',createdTime:file.createdTime||'',size:file.size||'0'})) };
  } catch (error) {
    console.error('Error listing drive files:', error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || 'Failed to list files' };
  }
}

export async function deleteDriveFileAction(id: string) {
  await requireRoles("ADMIN");

  try {
    const auth = await getDriveAuth();
    const drive = google.drive({ version: 'v3', auth });
    
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const file = await drive.files.get({ fileId: id, fields: 'id,parents' });
    if (!folderId || !file.data.parents?.includes(folderId)) throw new Error('Forbidden: file is outside the configured folder');
    await drive.files.delete({ fileId: id });
    return { success: true };
  } catch (error) {
    console.error('Error deleting drive file:', error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || 'Failed to delete file' };
  }
}

export async function bulkDeleteDriveFilesAction(ids: string[]) {
  await requireRoles("ADMIN");

  try {
    const auth = await getDriveAuth();
    const drive = google.drive({ version: 'v3', auth });
    
    // Google Drive v3 does not have a bulk delete API, so we delete sequentially or via Promise.all
    if (!Array.isArray(ids) || ids.length > 1000) throw new Error('Invalid file selection');
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    for (const id of ids) {
      const file = await drive.files.get({ fileId: id, fields: 'id,parents' });
      if (!folderId || !file.data.parents?.includes(folderId)) throw new Error('Forbidden: file is outside the configured folder');
    }
    await Promise.all(ids.map(id => drive.files.delete({ fileId: id })));
    return { success: true };
  } catch (error) {
    console.error('Error in bulk delete drive files:', error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || 'Failed to bulk delete files' };
  }
}
