# Quiz App Setup Guide

## 🚀 Quick Setup Steps

### 1. Set up Supabase Project

1. **Go to [supabase.com](https://supabase.com)** and sign in
2. **Create a new project** or select an existing one
3. **Wait for the project to be ready** (this may take a few minutes)

### 2. Get Your Supabase Credentials

1. **Go to Settings → API** in your project dashboard
2. **Copy the following values:**
   - **Project URL** (looks like: `https://abcdefghijklmnop.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### 3. Update Environment Variables

1. **Open the `.env` file** in the `quiz-app` directory
2. **Replace the placeholder values** with your actual Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Set up Database Schema

1. **Go to SQL Editor** in your Supabase dashboard
2. **Copy the entire content** from `supabase-schema.sql`
3. **Paste and run** the SQL in the Supabase SQL Editor
4. **Wait for all tables to be created**

### 5. Start the Application

1. **Restart the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser** and go to: `http://localhost:5173`

### 6. Test the Application

1. **Create an admin account:**
   - Go to `/admin/login`
   - Click "Don't have an account? Sign up"
   - Create your admin account

2. **Create your first quiz:**
   - Go to the admin dashboard
   - Click "Create New Quiz"
   - Add questions and save

3. **Test the user flow:**
   - Open a new browser tab
   - Go to the main page
   - Enter the access code
   - Join the quiz

## 🔧 Troubleshooting

### Common Issues:

1. **"Invalid access code" error:**
   - Make sure you've created a quiz in the admin panel
   - Check that the access code is correct

2. **"Supabase connection error":**
   - Verify your `.env` file has the correct credentials
   - Make sure your Supabase project is active

3. **"Database table not found":**
   - Run the SQL schema in Supabase SQL Editor
   - Check that all tables were created successfully

4. **Real-time features not working:**
   - Ensure realtime is enabled in your Supabase project
   - Check that the SQL schema included the realtime publications

## 📁 File Structure

```
quiz-app/
├── .env                    # Supabase credentials (create this)
├── supabase-schema.sql     # Database schema
├── SETUP.md               # This setup guide
├── src/
│   ├── components/        # Reusable UI components
│   ├── contexts/          # Supabase context
│   ├── pages/            # All page components
│   ├── utils/            # Supabase client
│   └── App.jsx           # Main app with routing
└── README.md             # Project documentation
```

## 🎯 Next Steps

Once everything is set up:

1. **Create your first quiz** with multiple questions
2. **Test the real-time features** with multiple browser tabs
3. **Customize the styling** in `src/index.css`
4. **Deploy to production** when ready

## 📞 Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify your Supabase credentials
3. Ensure the database schema is properly set up
4. Check that all dependencies are installed

Happy quizzing! 🎉
