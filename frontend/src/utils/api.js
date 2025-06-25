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
