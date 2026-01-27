-- 중복 제출 방지를 위한 부분 고유 인덱스 추가
-- 같은 session_id로 completed_at이 null이 아닌 레코드는 하나만 허용

-- 기존 인덱스가 있으면 삭제 (재실행 시)
DROP INDEX IF EXISTS idx_test_results_session_id_completed_unique;

-- 부분 고유 인덱스 생성 (completed_at이 null이 아닌 경우에만 unique 제약)
CREATE UNIQUE INDEX idx_test_results_session_id_completed_unique 
ON test_results(session_id) 
WHERE completed_at IS NOT NULL;

-- 인덱스 생성 확인
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'test_results' 
AND indexname = 'idx_test_results_session_id_completed_unique';
