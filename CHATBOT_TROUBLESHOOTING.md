# Troubleshooting Chatbot Errors

## Common Errors and Solutions

### 1. "AI service not configured"
**Problem:** OpenAI API key is missing or not loaded.

**Solution:**
- Check that `server/.env` file exists
- Verify `OPENAI_API_KEY` is set in the file
- Restart the server after adding/changing the API key
- Check server console for initialization messages

### 2. "Network error" or "Failed to fetch"
**Problem:** Server is not running or not accessible.

**Solution:**
- Make sure the server is running: `cd server && npm run dev`
- Check that server is on port 5000
- Verify client is configured to proxy to `http://localhost:5000`
- Check browser console for CORS errors

### 3. "Rate limit exceeded"
**Problem:** Too many requests to OpenAI API.

**Solution:**
- Wait a few minutes before trying again
- Check your OpenAI account usage limits
- Consider upgrading your OpenAI plan

### 4. "API key is invalid"
**Problem:** The OpenAI API key is incorrect or expired.

**Solution:**
- Verify the API key in your OpenAI account
- Make sure there are no extra spaces in the `.env` file
- Check that the key starts with `sk-`
- Regenerate the key if needed

### 5. "Quota exceeded"
**Problem:** You've reached your OpenAI API usage limit.

**Solution:**
- Check your OpenAI account billing
- Add payment method if needed
- Wait for quota reset or upgrade plan

## Debugging Steps

1. **Check Server Logs:**
   ```bash
   cd server
   npm run dev
   ```
   Look for:
   - ✅ OpenAI initialized successfully
   - ❌ Any error messages

2. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for error messages when sending a message

3. **Test API Directly:**
   ```bash
   curl -X POST http://localhost:5000/api/ai/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"Hello"}'
   ```

4. **Verify Environment:**
   ```bash
   cd server
   cat .env | grep OPENAI
   ```

## Quick Fixes

1. **Restart Server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Clear Browser Cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

3. **Check .env File:**
   ```bash
   cd server
   cat .env
   ```
   Make sure `OPENAI_API_KEY` is on a single line with no quotes

4. **Verify Server is Running:**
   - Check terminal for "Secure Web server running on port 5000"
   - Try accessing `http://localhost:5000/api/ai/chat` in browser (should show method not allowed, not connection refused)

## Still Having Issues?

1. Check the exact error message in the chatbot response
2. Check server console for detailed error logs
3. Check browser console (F12) for network errors
4. Verify OpenAI API key is valid by testing it directly with OpenAI


