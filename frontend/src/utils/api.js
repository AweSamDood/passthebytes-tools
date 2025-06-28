// src/utils/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export const convertToPdf = async (formData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/png-to-pdf/convert`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        // Return the blob for download
        return await response.blob();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const getConversionInfo = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/png-to-pdf/info`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const convertImage = async (files, outputFormat) => {
    const formData = new FormData();
    files.forEach(file => {
        formData.append('files', file);
    });
    formData.append('output_format', outputFormat);

    try {
        const response = await fetch(`${API_BASE_URL}/api/image-converter/convert-image`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        return response;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const generatePassword = async (options) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/password-generator/generate-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(options),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const generateQRCode = async (qrData, logoFile) => {
  const formData = new FormData();
  formData.append('request_data', JSON.stringify(qrData));
  if (logoFile) {
    formData.append('logo_file', logoFile);
  }

  const response = await fetch(`${API_BASE_URL}/api/qr-code-generator/generate`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("QR generation failed:", errorText);
    throw new Error('QR generation failed');
  }

  return response.blob();
};

export const getYouTubeInfo = async (url) => {
    const response = await fetch(`${API_BASE_URL}/api/youtube/info`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};

export const downloadYouTubeFile = async (url, format) => {
    const response = await fetch(`${API_BASE_URL}/api/youtube/download/${format}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    let filename = `download.${format}`;
    if (contentDisposition) {
        const filenameStarMatch = contentDisposition.match(/filename\*=utf-8''(.+)/i);
        if (filenameStarMatch && filenameStarMatch.length > 1) {
            filename = decodeURIComponent(filenameStarMatch[1]);
        } else {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
            if (filenameMatch && filenameMatch.length > 1) {
                filename = filenameMatch[1].replace(/"/g, '');
            }
        }
    }

    return { blob, filename };
};

export const getYouTubePlaylistInfo = async (url) => {
    const response = await fetch(`${API_BASE_URL}/api/youtube/playlist-info`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};

export const downloadYouTubePlaylist = async (url, video_ids) => {
    const response = await fetch(`${API_BASE_URL}/api/youtube/download-playlist`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, video_ids }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    let filename = 'playlist.zip';
    if (contentDisposition) {
        const filenameStarMatch = contentDisposition.match(/filename\*=utf-8''(.+)/i);
        if (filenameStarMatch && filenameStarMatch.length > 1) {
            filename = decodeURIComponent(filenameStarMatch[1]);
        } else {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
            if (filenameMatch && filenameMatch.length > 1) {
                filename = filenameMatch[1].replace(/"/g, '');
            }
        }
    }

    return { blob, filename };
};

export const startYouTubePlaylistDownload = async (url, video_ids) => {
    const response = await fetch(`${API_BASE_URL}/api/youtube/download-playlist`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, video_ids }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};

export const getYouTubePlaylistProgress = async (jobId) => {
    const response = await fetch(`${API_BASE_URL}/api/youtube/playlist-download-progress/${jobId}`);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};
