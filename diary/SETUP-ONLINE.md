# 멍뭉일지를 로그인 없이 휴대폰 브라우저로 열기

사이트는 **Vercel**(무료)에, 일기·사진은 **Supabase**(무료)에 둬요.
주소만 열면 바로 들어오고, 모든 데이터는 입장 비밀번호 4자리가 있어야 볼 수 있어요.

## 1. Supabase (저장소) — 약 5분

1. https://supabase.com 에서 **Start your project** → GitHub 계정으로 가입
2. **New project**
   - Name: `meongmung-diary`
   - Database Password: 아무거나 (따로 쓸 일은 없어요)
   - Region: **Northeast Asia (Seoul)**
3. 프로젝트가 만들어지면 왼쪽 메뉴 **SQL Editor** → **New query**
4. 저장소의 `diary/supabase/setup.sql` 내용을 **통째로** 붙여 넣고 **Run**
   (“Success. No rows returned” 가 나오면 끝)
5. 왼쪽 아래 **Project Settings → API Keys**(또는 **Data API**)에서 두 가지를 복사해 Claude 에게 알려 주세요
   - **Project URL** (예: `https://abcdxyz.supabase.co`)
   - **anon public** 키 또는 **publishable** 키 (`eyJ…` 또는 `sb_publishable_…`)
   - ⚠️ `service_role` / `secret` 키는 절대 알려 주지도, 넣지도 마세요.

## 2. Vercel (사이트) — 약 3분

1. https://vercel.com/signup 에서 **Continue with GitHub** 로 가입 (Hobby, 무료)
2. **Add New… → Project** → `woogi-96/mystery-Game` 옆 **Import**
   (목록에 없으면 **Adjust GitHub App Permissions** 에서 이 저장소를 허용해 주세요)
3. 설정 화면에서
   - **Project Name**: `meongmung-diary` → 주소가 `https://meongmung-diary.vercel.app` 가 돼요
   - **Framework Preset**: `Other`
   - **Root Directory**: **Edit** 를 눌러 `diary` 선택  ← 꼭!
   - Build and Output Settings 는 건드리지 않아요
4. **Deploy** → 끝나면 주소가 생겨요
5. 지금 작업 브랜치에 올리려면: 프로젝트 **Settings → Git → Production Branch** 를
   `claude/meongmung-diary-website-5qorb9` 로 바꾸고 **Deployments** 에서 **Redeploy**
   (이 브랜치를 main 에 합친 뒤라면 바꿀 필요 없어요)

이후로는 그 브랜치에 새 커밋이 올라올 때마다 사이트가 자동으로 바뀌어요.
(Netlify 를 쓰고 싶다면 저장소 맨 위 `netlify.toml` 이 이미 준비돼 있어요.)

## 3. 처음 열 때 순서 (중요)

1. **관리자 주소를 먼저** 여세요: `https://<사이트 주소>/#admin`
   → 처음 로그인할 때 쓴 비밀번호가 **관리자 비밀번호**가 돼요.
2. 그다음 일반 주소 `https://<사이트 주소>/` 를 열고 **입장 비밀번호 4자리**를 정해요.
3. 멍뭉이에게 일반 주소와 입장 비밀번호를 알려 주세요.
   멍뭉이 휴대폰에서 한 번 입력하면 다음부터는 바로 들어와요.

## 알아 두기

- Supabase 무료 프로젝트는 **7일 동안 아무도 안 쓰면 잠깐 멈춰요.** 그럴 땐 Supabase 대시보드에서 **Restore** 를 누르면 데이터 그대로 다시 켜져요.
- 무료 저장 공간은 데이터 500MB, 사진 1GB 정도예요.
- 입장 비밀번호를 잊으면 관리자 화면 → 🗑️ 데이터 삭제 → **입장 비밀번호 초기화** 후 새로 정하면 돼요.
