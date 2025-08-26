-- Quiz App Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable Row Level Security
ALTER TABLE IF EXISTS public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.answers ENABLE ROW LEVEL SECURITY;

-- Create quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    access_code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('mcq', 'true_false', 'short_answer')),
    options JSONB DEFAULT '[]',
    correct_answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create participants table
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create answers table
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_access_code ON public.quizzes(access_code);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON public.quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_participants_quiz_id ON public.participants(quiz_id);
CREATE INDEX IF NOT EXISTS idx_answers_participant_id ON public.answers(participant_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON public.answers(question_id);

-- RLS Policies for quizzes
CREATE POLICY "Users can view quizzes by access code" ON public.quizzes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create quizzes" ON public.quizzes
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Quiz creators can update their quizzes" ON public.quizzes
    FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for questions
CREATE POLICY "Users can view questions for quizzes" ON public.questions
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create questions" ON public.questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.quizzes 
            WHERE id = quiz_id AND created_by = auth.uid()
        )
    );

-- RLS Policies for participants
CREATE POLICY "Users can view participants" ON public.participants
    FOR SELECT USING (true);

CREATE POLICY "Users can create participants" ON public.participants
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own participation" ON public.participants
    FOR UPDATE USING (true);

-- RLS Policies for answers
CREATE POLICY "Users can view answers" ON public.answers
    FOR SELECT USING (true);

CREATE POLICY "Users can create answers" ON public.answers
    FOR INSERT WITH CHECK (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.quizzes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.answers;
