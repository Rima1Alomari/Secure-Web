# Quick Start Guide - Fix Chatbot Error

## Step 1: Start the Server

Open a terminal and run:
```bash
cd "/Users/rimaalomari/Desktop/Secure Web/server"
npm run dev
```

You should see:
- ✅ OpenAI initialized successfully
- Secure Web server running on port 5000

## Step 2: Start the Client

Open another terminal and run:
```bash
cd "/Users/rimaalomari/Desktop/Secure Web/client"
npm run dev
```

## Step 3: Test the Chatbot

1. Open browser to `http://localhost:3000`
2. Click the robot button (bottom-right)
3. Send a message
4. Check browser console (F12) for detailed errors

## Common Issues:

### Issue 1: Server not running
**Solution:** Make sure server is running on port 5000

### Issue 2: OpenAI API Key missing
**Solution:** Check `server/.env` file has `OPENAI_API_KEY`

### Issue 3: CORS error
**Solution:** Already fixed in the code

### Issue 4: Network error
**Solution:** Check that both server and client are running

## Debug Commands:

Check if server is running:
```bash
lsof -i :5000
```

Check OpenAI key:
```bash
cd server && cat .env | grep OPENAI
```

Test API directly:
```bash
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```


