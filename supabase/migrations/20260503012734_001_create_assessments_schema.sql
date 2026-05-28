/*
  # HealingMonk Assessment Schema
  
  1. New Tables
    - `assessments` - Stores completed assessments with overall scores
    - `assessment_findings` - Individual findings/issues detected per assessment
    - `programs` - Available HealingMonk programs to recommend
    - `assessment_programs` - Links assessments to recommended programs
  
  2. Tables Detail
    - assessments: User ID, overall score, score breakdown, timestamp
    - assessment_findings: Finding type, severity, details
    - programs: Program metadata, descriptions
    - assessment_programs: Recommended programs per assessment
  
  3. Security
    - Enable RLS on all tables
    - Public read access to programs table
    - Users can only access their own assessments
*/

CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  duration_weeks int NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score int NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  posture_score int NOT NULL CHECK (posture_score >= 0 AND posture_score <= 100),
  mobility_score int NOT NULL CHECK (mobility_score >= 0 AND mobility_score <= 100),
  stability_score int NOT NULL CHECK (stability_score >= 0 AND stability_score <= 100),
  assessment_type text NOT NULL, -- 'posture' or 'squat' or 'combined'
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessment_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  finding_type text NOT NULL, -- 'forward_head', 'rounded_shoulders', 'knee_alignment', 'uneven_balance', 'shoulder_imbalance'
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')), -- low, medium, high
  description text NOT NULL,
  recommendation text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessment_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  reason text, -- Why this program was recommended
  created_at timestamptz DEFAULT now(),
  UNIQUE(assessment_id, program_id)
);

-- Enable RLS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_programs ENABLE ROW LEVEL SECURITY;

-- Programs: Public read-only
CREATE POLICY "Programs are publicly readable"
  ON programs FOR SELECT
  TO public
  USING (true);

-- Assessments: Users can only view their own
CREATE POLICY "Users can view own assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Assessment Findings: Accessible via assessment ownership
CREATE POLICY "Users can view findings for own assessments"
  ON assessment_findings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_findings.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert findings for own assessments"
  ON assessment_findings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_findings.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

-- Assessment Programs: Accessible via assessment ownership
CREATE POLICY "Users can view recommended programs for own assessments"
  ON assessment_programs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_programs.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can link programs to own assessments"
  ON assessment_programs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_programs.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

-- Seed default programs
INSERT INTO programs (name, description, duration_weeks, image_url) VALUES
  ('Posture Correction Program', 'A comprehensive 4-week program focused on correcting forward head posture and strengthening the neck and upper back.', 4, 'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=600'),
  ('Core Stability Program', 'Build a strong core foundation with targeted exercises for balance and stability.', 6, 'https://images.pexels.com/photos/3807518/pexels-photo-3807518.jpeg?auto=compress&cs=tinysrgb&w=600'),
  ('Movement Mobility Program', 'Improve overall mobility and flexibility through guided movement patterns.', 5, 'https://images.pexels.com/photos/3807516/pexels-photo-3807516.jpeg?auto=compress&cs=tinysrgb&w=600');
