const axios = require('axios');

axios.post('http://localhost:11434/api/generate', {
  model: 'mistral',
  prompt: 'Hello',
  stream: false
}, {
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(res => console.log(res.data))
.catch(err => console.error('Failed:', err.message));
