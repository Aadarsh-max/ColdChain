import { api } from './client.js';

const readBlobError = async (blob) => {
  try {
    const body = JSON.parse(await blob.text());
    if (body && body.error && body.error.message) return body.error.message;
  } catch {
    return 'Download failed';
  }
  return 'Download failed';
};

export const downloadFile = async (path, params, filename) => {
  let response;
  try {
    response = await api.get(path, { params, responseType: 'blob', timeout: 60000 });
  } catch (err) {
    const data = err && err.response && err.response.data;
    if (data instanceof Blob) throw new Error(await readBlobError(data));
    throw err;
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const name = filename.replace(/\.csv$/i, `-${stamp}.csv`);

  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};