import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5001/api',
  withCredentials: true, // Send cookies (httpOnly JWT) with every request
});

export default API;
