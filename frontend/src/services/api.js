import axios from 'axios';

const API = axios.create({
    baseURL : 'http://localhost:5000/api',
    headers : {
        'Content-Type' : 'application/json',
    },
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem('chat-token');
    if(token){
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
})

export const loginAPI = (userData) => API.post('/auth/login',userData);
export const registerAPI = (userData) => API.post('/auth/register',userData);
