const axios = require('axios');

async function testEdit() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    const token = loginRes.data.token;
    console.log('Login successful');

    // Update video 135 description
    const updateRes = await axios.put('http://localhost:5000/api/videos/135', {
      description: 'Test video update ' + new Date().toISOString()
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Video update successful:', updateRes.data);

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testEdit();