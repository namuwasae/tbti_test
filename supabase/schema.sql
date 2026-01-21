-- 테스트 결과 테이블 (설문 결과, 인구통계 정보, 이메일 모두 포함)
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  gender TEXT, -- 'Male', 'Female', 'Prefer not to answer'
  age_group TEXT, -- '10s', '20s', '30s', '40s', '50s', '60+'
  region TEXT, -- 'East Asia', 'Southeast Asia', 'Europe', 'North America', 'Latin America', 'Oceania', 'Middle East', 'Africa', 'Other'
  email TEXT, -- 사용자 이메일 주소
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  answers JSONB NOT NULL
);

-- 사용자 로그 테이블 (각 질문별 응답 및 체류 시간)
CREATE TABLE IF NOT EXISTS user_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_result_id UUID REFERENCES test_results(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  answer TEXT NOT NULL,
  answer_index INTEGER NOT NULL,
  thinking_time_seconds DECIMAL(10, 3) NOT NULL,
  gender TEXT, -- 'Male', 'Female', 'Prefer not to answer'
  age_group TEXT, -- '10s', '20s', '30s', '40s', '50s', '60+'
  region TEXT, -- 'East Asia', 'Southeast Asia', 'Europe', 'North America', 'Latin America', 'Oceania', 'Middle East', 'Africa', 'Other'
  email TEXT, -- 사용자 이메일 주소
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 이탈 추적 테이블 (사용자가 테스트 중간에 나간 경우)
CREATE TABLE IF NOT EXISTS user_dropouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  gender TEXT, -- 'Male', 'Female', 'Prefer not to answer'
  age_group TEXT, -- '10s', '20s', '30s', '40s', '50s', '60+'
  region TEXT, -- 'East Asia', 'Southeast Asia', 'Europe', 'North America', 'Latin America', 'Oceania', 'Middle East', 'Africa', 'Other'
  question_id INTEGER,
  question_text TEXT,
  current_question_index INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  completed_questions INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds DECIMAL(10, 3) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 여행지 사진 평가 테이블
CREATE TABLE IF NOT EXISTS travel_image_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_result_id UUID REFERENCES test_results(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  image_filename TEXT NOT NULL,
  rating TEXT NOT NULL, -- 'good' or 'soso'
  thinking_time_seconds DECIMAL(10, 3) NOT NULL DEFAULT 0, -- 사진을 보고 고민한 시간 (초)
  gender TEXT, -- 'Male', 'Female', 'Prefer not to answer'
  age_group TEXT, -- '10s', '20s', '30s', '40s', '50s', '60+'
  region TEXT, -- 'East Asia', 'Southeast Asia', 'Europe', 'North America', 'Latin America', 'Oceania', 'Middle East', 'Africa', 'Other'
  email TEXT, -- 사용자 이메일 주소 (나중에 업데이트될 수 있음)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사진 설문 이탈 추적 테이블 (사용자가 사진 설문 중간에 나간 경우)
CREATE TABLE IF NOT EXISTS travel_image_dropouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_result_id UUID REFERENCES test_results(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  gender TEXT, -- 'Male', 'Female', 'Prefer not to answer'
  age_group TEXT, -- '10s', '20s', '30s', '40s', '50s', '60+'
  region TEXT, -- 'East Asia', 'Southeast Asia', 'Europe', 'North America', 'Latin America', 'Oceania', 'Middle East', 'Africa', 'Other'
  image_filename TEXT, -- 현재 보고 있던 사진 파일명
  current_image_index INTEGER NOT NULL, -- 현재 사진 인덱스
  total_images INTEGER NOT NULL, -- 전체 사진 개수
  completed_images INTEGER NOT NULL DEFAULT 0, -- 완료한 사진 개수 (평가를 완료한 사진 수)
  time_spent_seconds DECIMAL(10, 3) NOT NULL DEFAULT 0, -- 전체 소요 시간
  completed_ratings JSONB, -- 완료한 평가들 (이전까지 선택한 평가와 시간)
  email TEXT, -- 사용자 이메일 주소 (나중에 업데이트될 수 있음)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_test_results_session_id ON test_results(session_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at);
CREATE INDEX IF NOT EXISTS idx_user_logs_test_result_id ON user_logs(test_result_id);
CREATE INDEX IF NOT EXISTS idx_user_logs_session_id ON user_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_user_logs_question_id ON user_logs(question_id);
CREATE INDEX IF NOT EXISTS idx_user_dropouts_session_id ON user_dropouts(session_id);
CREATE INDEX IF NOT EXISTS idx_user_dropouts_question_id ON user_dropouts(question_id);
CREATE INDEX IF NOT EXISTS idx_user_dropouts_created_at ON user_dropouts(created_at);
CREATE INDEX IF NOT EXISTS idx_test_results_email ON test_results(email);
CREATE INDEX IF NOT EXISTS idx_travel_image_ratings_test_result_id ON travel_image_ratings(test_result_id);
CREATE INDEX IF NOT EXISTS idx_travel_image_ratings_session_id ON travel_image_ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_travel_image_ratings_image_filename ON travel_image_ratings(image_filename);
CREATE INDEX IF NOT EXISTS idx_travel_image_dropouts_test_result_id ON travel_image_dropouts(test_result_id);
CREATE INDEX IF NOT EXISTS idx_travel_image_dropouts_session_id ON travel_image_dropouts(session_id);
CREATE INDEX IF NOT EXISTS idx_travel_image_dropouts_created_at ON travel_image_dropouts(created_at);