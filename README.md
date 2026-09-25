# 지하철역 AI 안내 v1

OpenAI API 연결 전, 모바일 화면과 Vercel 배포를 먼저 확인하기 위한 테스트 프로젝트입니다.

## 확인할 것
- `/` : 모바일 챗봇 테스트 화면
- `/api/health` : 서버 라우트 정상 작동 확인

## Vercel 배포
1. 이 폴더의 파일을 GitHub 새 저장소에 업로드합니다.
2. Vercel → Add New → Project → 해당 GitHub 저장소 Import.
3. Framework Preset이 Next.js인지 확인하고 Deploy.
4. 배포 URL의 `/api/health`에서 `"ok": true`가 나오면 서버 기능도 정상입니다.

OpenAI API 키는 아직 필요 없습니다.
