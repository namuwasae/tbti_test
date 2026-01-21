-- 통합 마이그레이션: 모든 테이블에 인구통계 및 이메일 컬럼 추가
-- 이 스크립트는 기존 테이블에 누락된 컬럼들을 추가하고 기존 데이터를 업데이트합니다.
-- SQL Editor에 이 파일 하나만 복사해서 실행하면 됩니다.

-- ============================================
-- 1. test_results 테이블에 컬럼 추가
-- ============================================

-- gender 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_results' AND column_name = 'gender'
    ) THEN
        ALTER TABLE test_results ADD COLUMN gender TEXT;
    END IF;
END $$;

-- age_group 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_results' AND column_name = 'age_group'
    ) THEN
        ALTER TABLE test_results ADD COLUMN age_group TEXT;
    END IF;
END $$;

-- region 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_results' AND column_name = 'region'
    ) THEN
        ALTER TABLE test_results ADD COLUMN region TEXT;
    END IF;
END $$;

-- email 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_results' AND column_name = 'email'
    ) THEN
        ALTER TABLE test_results ADD COLUMN email TEXT;
    END IF;
END $$;

-- ============================================
-- 2. user_dropouts 테이블에 컬럼 추가
-- ============================================

-- gender 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_dropouts' AND column_name = 'gender'
    ) THEN
        ALTER TABLE user_dropouts ADD COLUMN gender TEXT;
    END IF;
END $$;

-- age_group 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_dropouts' AND column_name = 'age_group'
    ) THEN
        ALTER TABLE user_dropouts ADD COLUMN age_group TEXT;
    END IF;
END $$;

-- region 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_dropouts' AND column_name = 'region'
    ) THEN
        ALTER TABLE user_dropouts ADD COLUMN region TEXT;
    END IF;
END $$;

-- ============================================
-- 3. user_logs 테이블에 컬럼 추가
-- ============================================

-- gender 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_logs' AND column_name = 'gender'
    ) THEN
        ALTER TABLE user_logs ADD COLUMN gender TEXT;
    END IF;
END $$;

-- age_group 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_logs' AND column_name = 'age_group'
    ) THEN
        ALTER TABLE user_logs ADD COLUMN age_group TEXT;
    END IF;
END $$;

-- region 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_logs' AND column_name = 'region'
    ) THEN
        ALTER TABLE user_logs ADD COLUMN region TEXT;
    END IF;
END $$;

-- email 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_logs' AND column_name = 'email'
    ) THEN
        ALTER TABLE user_logs ADD COLUMN email TEXT;
    END IF;
END $$;

-- ============================================
-- 4. 기존 데이터 통합 및 업데이트
-- ============================================

-- user_emails 테이블의 데이터를 test_results로 통합 (user_emails 테이블이 존재하는 경우)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_emails'
    ) THEN
        UPDATE test_results tr
        SET email = ue.email
        FROM user_emails ue
        WHERE tr.session_id = ue.session_id
          AND tr.email IS NULL;
    END IF;
END $$;

-- user_logs 레코드의 인구통계 정보 업데이트 (test_results에서 가져오기)
UPDATE user_logs ul
SET 
    gender = tr.gender,
    age_group = tr.age_group,
    region = tr.region
FROM test_results tr
WHERE ul.test_result_id = tr.id
  AND (ul.gender IS NULL OR ul.age_group IS NULL OR ul.region IS NULL);

-- user_logs 레코드의 이메일 정보 업데이트 (test_results에서 가져오기)
UPDATE user_logs ul
SET email = tr.email
FROM test_results tr
WHERE ul.test_result_id = tr.id
  AND tr.email IS NOT NULL
  AND ul.email IS NULL;

-- ============================================
-- 5. travel_image_ratings 테이블에 thinking_time_seconds 컬럼 추가
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'travel_image_ratings' 
        AND column_name = 'thinking_time_seconds'
    ) THEN
        ALTER TABLE travel_image_ratings 
        ADD COLUMN thinking_time_seconds DECIMAL(10, 3) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- ============================================
-- 6. travel_image_dropouts 테이블 생성
-- ============================================

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

-- ============================================
-- 7. 인덱스 생성
-- ============================================

-- test_results의 email 컬럼에 대한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_test_results_email ON test_results(email);

-- travel_image_dropouts 테이블 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_travel_image_dropouts_test_result_id ON travel_image_dropouts(test_result_id);
CREATE INDEX IF NOT EXISTS idx_travel_image_dropouts_session_id ON travel_image_dropouts(session_id);
CREATE INDEX IF NOT EXISTS idx_travel_image_dropouts_created_at ON travel_image_dropouts(created_at);

-- ============================================
-- 마이그레이션 완료
-- ============================================
