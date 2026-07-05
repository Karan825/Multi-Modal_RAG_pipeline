import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
    withCredentials: true,
    timeout: 120000, // 2 minute timeout — allows CPU embedding generation to complete
});

export default api;