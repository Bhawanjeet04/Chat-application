import axios from 'axios';

const serverBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const API = axios.create({
    baseURL: `${serverBase}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true 
});

export const loginAPI = (userData) => API.post('/auth/login', userData);
export const registerAPI = (userData) => API.post('/auth/register', userData);

export const sendRequestAPI = (targetUsername) => API.post('/requests/send', { targetUsername });
export const getPendingRequestsAPI = () => API.get('/requests/pending');

export const respondToRequestAPI = (requestId, action) => API.put(`/requests/respond/${requestId}`, { action });
export const changePasswordAPI = (passwordData) => API.put('/auth/change-password', passwordData);
export const getChatHistoryAPI = (connectionId) => API.get(`/chats/${connectionId}`);
export const getAcceptedConnectionsAPI = () => API.get('/requests/accepted');
export const getSentRequestsAPI = () => API.get('/requests/sent');
export const removeConnectionAPI = (connectionId) => API.delete(`/chats/${connectionId}`);
export const deleteAccountAPI = () => API.delete('/auth/delete-account');

export default API;