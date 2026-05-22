import axios from 'axios';

const API = axios.create({
    baseURL : 'http://localhost:5000/api',
    headers : {
        'Content-Type' : 'application/json',
    },
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem('chat_token');
    if(token){
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const loginAPI = (userData) => API.post('/auth/login', userData);
export const registerAPI = (userData) => API.post('/auth/register', userData);

export const sendRequestAPI = (targetUsername) => API.post('/requests/send', { targetUsername });
export const getPendingRequestsAPI = () => API.get('/requests/pending');
export const respondToRequestAPI = (requestId, action) => API.put(`/requests/respond/${requestId}`, { action });

export const getChatHistoryAPI = (connectionId) => API.get(`/chats/${connectionId}`);
export const getAcceptedConnectionsAPI = () => API.get('/requests/accepted');
export const removeConnectionAPI = (connectionId) => API.delete(`/chats/${connectionId}`);