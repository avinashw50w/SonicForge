import axios from 'axios';

const API_BASE = '/api';

export const extractAudioFromVideo = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post(`${API_BASE}/extract`, formData);
  return res.data;
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

export const getFullUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    return `http://localhost:3001${path}`;
};