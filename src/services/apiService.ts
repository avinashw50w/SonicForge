import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export const extractAudioFromVideo = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post(`${API_BASE}/extract`, formData);
  return res.data; // { url, filename }
};

export const processAudio = async (file: File, config: any) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('config', JSON.stringify(config));
  const res = await axios.post(`${API_BASE}/process-single`, formData);
  return res.data;
};

export const processMultiAudio = async (files: File[], operation: 'join' | 'mix') => {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  formData.append('operation', operation);
  const res = await axios.post(`${API_BASE}/process-multi`, formData);
  return res.data;
};

export const getFullUrl = (path: string) => `http://localhost:3001${path}`;

// Helper to force download of a URL by fetching as blob
export const downloadFile = async (url: string, filename: string) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error("Download failed, opening in new tab", error);
        window.open(url, '_blank');
    }
};