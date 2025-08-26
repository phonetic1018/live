# Quiz App - Real-time Quiz Platform

A full-stack quiz web application built with React, TailwindCSS, and Supabase. Features real-time quiz management, participant tracking, and comprehensive results analysis.

## Features

### For Users
- Join quizzes using unique access codes
- Real-time quiz participation
- Multiple question types (MCQ, True/False, Short Answer)
- Live score tracking and results

### For Admins
- Create and manage quizzes
- Real-time participant monitoring
- Quiz flow control
- Comprehensive results dashboard
- Question statistics and analytics

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: TailwindCSS
- **Backend**: Supabase (Database, Authentication, Real-time)
- **Routing**: React Router DOM
- **State Management**: React Context + Supabase Realtime

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd quiz-app
npm install
```

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Schema

Run the following SQL in your Supabase SQL editor:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create tables
CREATE TABLE quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  access_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'true_false', 'short_answer')),
  options JSONB DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view quizzes" ON quizzes FOR SELECT USING (true);
CREATE POLICY "Users can create quizzes" ON quizzes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own quizzes" ON quizzes FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can view questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Users can create questions" ON questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update questions" ON questions FOR UPDATE USING (true);

CREATE POLICY "Users can view participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Users can create participants" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update participants" ON participants FOR UPDATE USING (true);

CREATE POLICY "Users can view answers" ON answers FOR SELECT USING (true);
CREATE POLICY "Users can create answers" ON answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update answers" ON answers FOR UPDATE USING (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE quizzes;
ALTER PUBLICATION supabase_realtime ADD TABLE questions;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE answers;
```

### 4. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Usage

### For Admins

1. **Sign Up/Login**: Visit `/admin/login` to create an account or sign in
2. **Create Quiz**: Use the dashboard to create a new quiz with questions
3. **Manage Quiz**: Control the quiz flow, monitor participants, and view results
4. **View Results**: Analyze participant performance and question statistics

### For Users

1. **Join Quiz**: Enter the access code provided by the admin
2. **Enter Name**: Provide your name to join the quiz
3. **Wait in Lobby**: Wait for the admin to start the quiz
4. **Take Quiz**: Answer questions in real-time as they appear
5. **View Results**: See your score and detailed results

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.jsx
│   ├── Card.jsx
│   └── Input.jsx
├── contexts/           # React contexts
│   └── SupabaseContext.jsx
├── pages/             # Page components
│   ├── AccessCodeInput.jsx
│   ├── EnterName.jsx
│   ├── Lobby.jsx
│   ├── Quiz.jsx
│   ├── Results.jsx
│   ├── AdminLogin.jsx
│   ├── AdminDashboard.jsx
│   ├── CreateQuiz.jsx
│   ├── ManageQuiz.jsx
│   └── QuizResults.jsx
├── utils/             # Utility functions
│   └── supabaseClient.js
├── App.jsx           # Main app component
└── index.css         # Global styles
```

## Key Features

### Real-time Functionality
- Live participant updates in lobby
- Real-time quiz control and question progression
- Instant score calculation and results

### Question Types
- **Multiple Choice**: Select from predefined options
- **True/False**: Simple binary choice questions
- **Short Answer**: Text-based responses

### Admin Controls
- Start/stop quiz functionality
- Question-by-question progression
- Participant monitoring
- Comprehensive analytics

### User Experience
- Responsive design with TailwindCSS
- Smooth transitions and animations
- Intuitive navigation
- Real-time feedback

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For support or questions, please open an issue in the repository.
