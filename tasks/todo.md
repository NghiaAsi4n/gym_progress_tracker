# Task Checklist: Gym Progress Tracker MVP

Mỗi task phải được hoàn thành trong một focused session, có test trước hoặc cùng implementation, và giữ hệ thống build được.

## Phase 1: Foundation

### Task 1: Khởi tạo workspace và quality tooling

**Mô tả:** Tạo npm workspace và các lệnh root thống nhất cho lint, format, typecheck, test và build.

**Acceptance criteria:**

- [x] Root workspace nhận diện `apps/*` và `packages/*`.
- [x] TypeScript strict, ESLint và formatter có cấu hình dùng chung.
- [x] Các root scripts tồn tại và trả lỗi đúng khi package con lỗi.

**Verification:**

- [x] Chạy `npm run lint` và `npm run typecheck`.
- [x] Chạy `npm test` và `npm run build`.

**Dependencies:** Không.

**Files dự kiến:** `package.json`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc.json`, `.gitignore`.

**Scope:** M.

### Task 2: Khởi tạo Express API và cấu hình môi trường

**Mô tả:** Tạo API skeleton, typed env validation, Mongo connection và health endpoint.

**Acceptance criteria:**

- [x] API khởi động/tắt graceful và fail fast khi env sai.
- [x] `GET /api/v1/health` trả status ổn định.
- [x] MongoDB local chạy từ Docker Compose.

**Verification:**

- [x] Integration test health endpoint.
- [x] Chạy API với MongoDB local và dừng bằng SIGTERM.

**Dependencies:** Task 1.

**Files dự kiến:** `apps/api/package.json`, `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/src/config/env.ts`, `compose.yaml`.

**Scope:** M.

### Task 3: Khởi tạo React web app và route shell

**Mô tả:** Tạo Vite React app, router, query client và layout responsive tối thiểu.

**Acceptance criteria:**

- [x] Web app render route shell và trang 404.
- [x] API client gọi được health endpoint.
- [x] Error boundary hiển thị fallback có thể phục hồi.

**Verification:**

- [x] Component test route shell và error fallback.
- [x] `npm run build --workspace apps/web`.

**Dependencies:** Task 1, Task 2.

**Files dự kiến:** `apps/web/package.json`, `apps/web/src/main.tsx`, `apps/web/src/app/router.tsx`, `apps/web/src/app/providers.tsx`, `apps/web/src/services/api-client.ts`.

**Scope:** M.

### Task 4: Thiết lập shared API contracts

**Mô tả:** Định nghĩa Zod schemas dùng chung, paginated response và error response nhất quán.

**Acceptance criteria:**

- [x] Web và API import cùng input/output schemas.
- [x] Error codes và HTTP mapping được document/test.
- [x] Pagination contract áp dụng được cho mọi list endpoint.

**Verification:**

- [x] Contract unit tests cho success/error/pagination.
- [x] Typecheck cả web và API không copy DTO.

**Dependencies:** Task 1.

**Files dự kiến:** `packages/contracts/package.json`, `packages/contracts/src/index.ts`, `packages/contracts/src/api.ts`, `packages/contracts/src/errors.ts`, `packages/contracts/src/api.test.ts`.

**Scope:** M.

## Checkpoint 1

- [x] Root lint, typecheck, test và build đều xanh.
- [x] Health flow chạy từ browser đến API/MongoDB.

## Phase 2: Experience foundation

### Task 5: Xây Greek God design system và theme

**Mô tả:** Định nghĩa color/type/spacing/motion tokens và theme light/dark/system theo hướng obsidian–marble.

**Acceptance criteria:**

- [x] Component primitives dùng CSS variables, không hard-code màu theme.
- [x] Theme được áp dụng trước first paint và hỗ trợ system changes.
- [x] Focus, contrast và reduced-motion đáp ứng accessibility.

**Verification:**

- [x] Component tests cho theme switch/system/reduced motion.
- [x] Visual review 360 px và 1440 px ở light/dark.

**Dependencies:** Task 3.

**Files dự kiến:** `apps/web/src/styles/tokens.css`, `apps/web/src/styles/global.css`, `apps/web/src/features/preferences/theme.ts`, `apps/web/src/components/ui/Button.tsx`, `apps/web/src/components/ui/Card.tsx`.

**Scope:** M.

### Task 6: Thiết lập i18n Việt/Anh

**Mô tả:** Tạo translation namespaces, locale detection và switcher lưu local trước khi có account preferences.

**Acceptance criteria:**

- [x] Shell và auth placeholders có đủ bản dịch `vi`/`en`.
- [x] Fallback locale là `vi` và không render raw translation key.
- [x] Lựa chọn locale được giữ sau reload.

**Verification:**

- [x] Component tests render ở cả hai locale.
- [x] Test fallback khi thiếu key.

**Dependencies:** Task 3.

**Files dự kiến:** `apps/web/src/i18n/index.ts`, `apps/web/src/i18n/vi/common.json`, `apps/web/src/i18n/en/common.json`, `apps/web/src/features/preferences/LanguageSwitcher.tsx`.

**Scope:** M.

## Checkpoint 2

- [x] Shell responsive, bilingual và theme persistence hoạt động.
- [x] Không có lỗi keyboard focus hoặc reduced-motion nghiêm trọng.

## Phase 3: Authentication and preferences

### Task 7: Implement register/login API

**Mô tả:** Tạo user model, password hashing, register/login contracts và access JWT ngắn hạn.

**Acceptance criteria:**

- [x] Email normalized/unique và mật khẩu chỉ lưu dạng hash.
- [x] Login đúng trả access token; credential sai trả lỗi chung.
- [x] Protected route xác thực bearer token và scope user.

**Verification:**

- [x] Integration tests register, duplicate email, login và protected route.
- [x] Test không làm lộ password/hash trong response.

**Dependencies:** Task 2, Task 4.

**Files dự kiến:** `apps/api/src/modules/auth/auth.model.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`, `auth.integration.test.ts`.

**Scope:** M.

### Task 8: Implement refresh rotation và logout

**Mô tả:** Tạo refresh-session persistence, secure cookie, rotation, reuse detection và revocation.

**Acceptance criteria:**

- [x] Refresh hợp lệ rotate token và thu hồi token trước.
- [x] Reuse thu hồi token family; logout xóa cookie và thu hồi session.
- [x] Refresh endpoint từ chối Origin/CSRF không hợp lệ.

**Verification:**

- [x] Integration tests rotation, replay, expiry, logout và cookie flags.
- [x] Test raw refresh token không tồn tại trong database/log.

**Dependencies:** Task 7.

**Files dự kiến:** `apps/api/src/modules/auth/refresh-session.model.ts`, `token.service.ts`, `refresh.service.ts`, `auth.controller.ts`, `refresh.integration.test.ts`.

**Scope:** M.

### Task 9: Implement auth UI và token lifecycle

**Mô tả:** Tạo register/login screens, access token in-memory store và single-flight refresh khi gặp 401.

**Acceptance criteria:**

- [x] Register/login/logout hoạt động với localized validation.
- [x] Reload phục hồi session qua refresh cookie.
- [x] Concurrent 401 chỉ tạo một refresh request và retry an toàn.

**Verification:**

- [x] Component/integration tests auth forms và refresh queue.
- [x] Không có token trong local/session storage.

**Dependencies:** Task 5, Task 6, Task 8.

**Files dự kiến:** `apps/web/src/features/auth/AuthProvider.tsx`, `api-auth.ts`, `LoginPage.tsx`, `RegisterPage.tsx`, `auth.test.tsx`.

**Scope:** M.

### Task 10: Đồng bộ account preferences

**Mô tả:** Lưu unit, locale và theme preference vào user profile; merge an toàn với preference local trước login.

**Acceptance criteria:**

- [x] `PATCH /me/preferences` chỉ nhận enum hợp lệ.
- [x] Sau login, account preference là nguồn chính và được áp dụng không reload.
- [x] Đổi kg/lb, vi/en hoặc theme được giữ ở thiết bị khác sau login.

**Verification:**

- [x] API integration tests ownership/validation.
- [x] Component test merge và persistence.

**Dependencies:** Task 9.

**Files dự kiến:** `packages/contracts/src/user.ts`, `apps/api/src/modules/users/user.service.ts`, `user.routes.ts`, `apps/web/src/features/preferences/PreferencesProvider.tsx`, `preferences.test.tsx`.

**Scope:** M.

## Checkpoint 3

- [x] Multi-account isolation, refresh rotation và logout được chứng minh bằng tests.
- [x] Theme/language/unit đồng bộ với tài khoản.

### Phase 3 implementation note

Implemented in the current Phase 3 branch: register/login with access JWT, rotating refresh sessions with replay detection and logout, account preference persistence, web auth screens, in-memory token lifecycle, and single-flight refresh retry. Verification: root lint, typecheck, build, and test pass.

## Phase 4: Exercise and workout planning

### Task 11: Xây exercise catalog

**Mô tả:** Seed system exercises và cho phép người dùng list/search/filter/create/update/delete custom exercise.

**Acceptance criteria:**

- [x] List phân trang kết hợp system và owned exercises.
- [x] Custom exercise CRUD enforce ownership và lưu muscle groups, movement pattern, equipment, difficulty.
- [x] Search/filter theo name và muscle group hoạt động ở UI.

**Verification:**

- [x] API integration tests filtering, pagination và ownership.
- [x] Component tests search/filter/create form.

**Dependencies:** Task 10.

**Files dự kiến:** `packages/contracts/src/exercise.ts`, `apps/api/src/modules/exercises/exercise.module.ts`, `exercise.integration.test.ts`, `apps/web/src/features/exercises/ExerciseListPage.tsx`, `exercise-list.test.tsx`.

**Scope:** M.

### Task 12: Xây workout-template CRUD

**Mô tả:** Cho phép tạo, xem, sửa, xóa mẫu và sắp thứ tự exercises trong template.

**Acceptance criteria:**

- [x] Template chứa exercise references có thứ tự và validate ownership/availability.
- [x] CRUD và reorder hoạt động từ UI đến MongoDB.
- [x] Xóa custom exercise đang được dùng trả conflict rõ ràng.

**Verification:**

- [x] API integration tests CRUD, order, invalid reference và ownership.
- [x] Component test template editor.

**Dependencies:** Task 11.

**Files dự kiến:** `packages/contracts/src/workout-template.ts`, `apps/api/src/modules/workout-templates/template.module.ts`, `template.integration.test.ts`, `apps/web/src/features/templates/TemplateEditorPage.tsx`, `template-editor.test.tsx`.

**Scope:** M.

### Task 13: Xây training plan và calendar tuần

**Mô tả:** Cho phép tạo plan theo mục tiêu, xếp workout template vào các ngày và dời/bỏ một occurrence cụ thể.

**Acceptance criteria:**

- [x] Training-plan CRUD và active-plan selection enforce ownership.
- [x] Calendar tạo occurrence đúng theo timezone và date range.
- [x] Schedule override có thể reschedule/skip một occurrence mà không đổi toàn bộ lịch lặp.

**Verification:**

- [x] API integration tests CRUD, timezone, recurrence, override và ownership.
- [x] Component test calendar tạo/sửa/dời lịch.

**Dependencies:** Task 12.

**Files dự kiến:** `packages/contracts/src/training-plan.ts`, `apps/api/src/modules/training-plans/training-plan.module.ts`, `training-plan.integration.test.ts`, `apps/web/src/features/training-plans/TrainingCalendarPage.tsx`, `training-calendar.test.tsx`.

**Scope:** M.

### Task 14: Xây rule-based exercise suggestions

**Mô tả:** Phân tích goal, level, equipment, duration, muscle groups và movement patterns để gợi ý bài kèm lý do.

**Acceptance criteria:**

- [x] Cùng input luôn trả cùng suggestion/reason code theo thứ tự ổn định.
- [x] Không gợi ý thiết bị không có; custom exercise đủ metadata được xét.
- [x] Xem suggestion không mutation plan; chỉ nút xác nhận mới cập nhật template/plan.

**Verification:**

- [x] Unit tests cho rule coverage, exclusions, ordering và reason codes.
- [x] API/component tests cho view/accept suggestion và ownership.

**Dependencies:** Task 13.

**Files dự kiến:** `packages/contracts/src/suggestion.ts`, `apps/api/src/modules/training-plans/suggestion.service.ts`, `suggestion.service.test.ts`, `apps/web/src/features/training-plans/SuggestionPanel.tsx`, `suggestion-panel.test.tsx`.

**Scope:** M.

## Checkpoint 4

- [x] Exercise catalog, template, weekly calendar và explainable suggestions chạy end-to-end.

### Phase 4 implementation note

Implemented exercise catalog hardening and responsive UI, workout-template CRUD/reorder with reference checks, owned training-plan CRUD with active-plan selection, weekly recurrence and per-occurrence overrides, and deterministic equipment-aware suggestions with explicit acceptance. Verification: root lint, typecheck, build, and 83 tests pass; protected routes and mobile/desktop layouts were visually checked in headless Chrome.

## Phase 5: Workout execution

### Task 15: Xây workout draft API

**Mô tả:** Tạo workout từ template, calendar occurrence hoặc trống; cập nhật exercises/sets và chống ghi đè draft cũ.

**Acceptance criteria:**

- [ ] Chỉ có tối đa một active draft cho mỗi user.
- [ ] PATCH dùng version field và trả conflict khi client cũ.
- [ ] Set giữ order, weight, reps, completion và notes; scheduled workout giữ source occurrence.

**Verification:**

- [ ] Integration tests create/update/conflict/ownership.
- [ ] Unit tests validation cho sets.

**Dependencies:** Task 13.

**Files dự kiến:** `packages/contracts/src/workout.ts`, `apps/api/src/modules/workouts/workout.model.ts`, `workout.service.ts`, `workout.routes.ts`, `workout-draft.integration.test.ts`.

**Scope:** M.

### Task 16: Xây active-workout UI và autosave

**Mô tả:** Tạo mobile-first workout screen, thao tác nhanh với set và autosave có trạng thái rõ.

**Acceptance criteria:**

- [ ] Thêm/xóa/reorder exercise và set bằng touch/keyboard.
- [ ] Autosave debounce, retry có giới hạn và xử lý version conflict.
- [ ] Reload phục hồi đúng draft gần nhất.

**Verification:**

- [ ] Component tests editing/autosave/conflict.
- [ ] Manual mobile check với input bàn phím số.

**Dependencies:** Task 15.

**Files dự kiến:** `apps/web/src/features/workouts/ActiveWorkoutPage.tsx`, `ExerciseSetTable.tsx`, `useWorkoutDraft.ts`, `workout-api.ts`, `active-workout.test.tsx`.

**Scope:** M.

### Task 17: Complete workout và history

**Mô tả:** Hoàn thành/hủy workout, list history có pagination và xem detail read-only.

**Acceptance criteria:**

- [ ] Complete ghi timestamp và reject session không hợp lệ.
- [ ] History list/detail enforce ownership và sort mới nhất trước.
- [ ] UI hiển thị duration, exercises, sets và volume.

**Verification:**

- [ ] API integration tests transitions, pagination và ownership.
- [ ] E2E template → draft → reload → complete → history.

**Dependencies:** Task 16.

**Files dự kiến:** `apps/api/src/modules/workouts/workout-completion.service.ts`, `workout-history.integration.test.ts`, `apps/web/src/features/history/WorkoutHistoryPage.tsx`, `WorkoutDetailPage.tsx`, `workout-flow.spec.ts`.

**Scope:** M.

## Checkpoint 5

- [ ] Workout logging core flow chạy end-to-end và giữ dữ liệu qua reload.

## Phase 6: Progress tracking

### Task 18: Tính exercise progress

**Mô tả:** Tính best weight, volume và Epley estimated 1RM từ completed workouts.

**Acceptance criteria:**

- [ ] Metrics gồm best weight, volume, Epley 1RM, reps-at-weight, weekly sets và PR history.
- [ ] Endpoint trả time series theo range và exercise ownership/visibility.
- [ ] Index/query plan đáp ứng dataset kiểm thử mục tiêu.

**Verification:**

- [ ] Unit tests metric edge cases và kg/lb conversion.
- [ ] Integration test aggregation theo user/range.

**Dependencies:** Task 17.

**Files dự kiến:** `packages/contracts/src/progress.ts`, `apps/api/src/modules/progress/exercise-progress.service.ts`, `progress.routes.ts`, `exercise-progress.test.ts`, `progress.integration.test.ts`.

**Scope:** M.

### Task 19: Xây body-weight CRUD

**Mô tả:** Tạo một entry mỗi ngày, canonical kg storage, chỉnh sửa/xóa và hiển thị theo unit preference.

**Acceptance criteria:**

- [ ] Unique `{ userId, measuredOn }` được enforce ở DB và API.
- [ ] Input kg/lb chuyển chính xác sang canonical kg.
- [ ] CRUD UI và API enforce ownership.

**Verification:**

- [ ] Unit tests conversion/rounding.
- [ ] API/component tests CRUD, duplicate date và ownership.

**Dependencies:** Task 10.

**Files dự kiến:** `packages/contracts/src/body-weight.ts`, `apps/api/src/modules/body-weight/body-weight.module.ts`, `body-weight.integration.test.ts`, `apps/web/src/features/body-weight/BodyWeightPage.tsx`, `body-weight.test.tsx`.

**Scope:** M.

### Task 20: Tính calorie tiêu hao ước tính

**Mô tả:** Tính calorie của completed workout từ MET profile, duration và body-weight snapshot; hiển thị rõ là ước tính.

**Acceptance criteria:**

- [ ] Công thức/rounding đúng; chọn weight entry gần nhất không nằm sau ngày tập, thiếu input trả reason thay vì tự đoán.
- [ ] Workout lưu `estimatedCalories`, input snapshot, method và `sourceVersion`.
- [ ] Đổi profile tính lại có audit input; UI luôn gắn nhãn “ước tính”.

**Verification:**

- [ ] Unit tests cho MET profiles, formula, rounding và missing inputs.
- [ ] Integration/component tests cho calculate/recalculate, ownership và localized label.

**Dependencies:** Task 17, Task 19.

**Files dự kiến:** `packages/contracts/src/calorie.ts`, `apps/api/src/modules/progress/calorie-estimate.service.ts`, `calorie-estimate.test.ts`, `apps/api/src/modules/workouts/workout-completion.service.ts`, `apps/web/src/features/history/CalorieEstimateCard.tsx`.

**Scope:** M.

### Task 21: Xây progress charts và dashboard

**Mô tả:** Hiển thị exercise/body-weight trends, calorie estimate, latest delta và summary cards trong dashboard Greek God.

**Acceptance criteria:**

- [ ] Charts lọc time range và cập nhật sau mutation.
- [ ] Dữ liệu chart có text/table fallback và không chỉ dựa vào màu.
- [ ] Dashboard tải độc lập từng widget và có empty/error/loading states.

**Verification:**

- [ ] Component tests transforms và UI states.
- [ ] Visual/accessibility review light/dark, vi/en, mobile/desktop.

**Dependencies:** Task 18, Task 19, Task 20.

**Files dự kiến:** `apps/web/src/features/progress/ProgressDashboardPage.tsx`, `ExerciseProgressChart.tsx`, `BodyWeightChart.tsx`, `ProgressSummary.tsx`, `progress-dashboard.test.tsx`.

**Scope:** M.

## Checkpoint 6

- [ ] Exercise, body-weight và calorie estimate chính xác, có nguồn, accessible và responsive.

## Phase 7: Hardening

### Task 22: Security hardening

**Mô tả:** Audit auth/input/ownership, thêm secure headers, request limits và rate limiting cho endpoint nhạy cảm.

**Acceptance criteria:**

- [ ] Auth endpoints có rate limit và cookie/CORS/Origin policy đúng môi trường.
- [ ] Payload/query limits và centralized sanitization/validation được test.
- [ ] Log không chứa password, JWT hoặc cookie.

**Verification:**

- [ ] Security integration tests cho CSRF, replay, IDOR và brute-force controls.
- [ ] Dependency/security audit không còn issue nghiêm trọng chưa xử lý.

**Dependencies:** Task 21.

**Files dự kiến:** `apps/api/src/middleware/security.ts`, `rate-limit.ts`, `error-handler.ts`, `apps/api/src/config/security.ts`, `security.integration.test.ts`.

**Scope:** M.

### Task 23: Hardening accessibility cho shared UI primitives

**Mô tả:** Chuẩn hóa keyboard, screen-reader semantics, focus management và reduced motion ở các primitive dùng chung.

**Acceptance criteria:**

- [ ] Button, input, dialog và app shell có semantics/focus đúng.
- [ ] Dialog giữ focus, trả focus khi đóng và hỗ trợ Escape.
- [ ] Automated accessibility test không có issue nghiêm trọng ở route shell.

**Verification:**

- [ ] Component tests bằng keyboard và accessibility matcher.
- [ ] Manual screen-reader smoke test cho navigation và dialog.

**Dependencies:** Task 21.

**Files dự kiến:** `apps/web/src/components/ui/Button.tsx`, `Input.tsx`, `Dialog.tsx`, `apps/web/src/app/AppShell.tsx`, `apps/web/src/app/accessibility.test.tsx`.

**Scope:** M.

### Task 24: Audit responsive, bilingual content và theme

**Mô tả:** Kiểm tra translation completeness, text overflow, contrast và visual consistency cho Greek God light/dark.

**Acceptance criteria:**

- [ ] Không thiếu key vi/en và không render raw translation key.
- [ ] Core pages không overflow ở 360/768/1440 px.
- [ ] Light/dark giữ contrast và hierarchy rõ, không phụ thuộc chỉ vào màu.

**Verification:**

- [ ] Chạy theme/i18n integration tests.
- [ ] Ghi visual audit matrix vi/en × light/dark × breakpoints.

**Dependencies:** Task 21, Task 23.

**Files dự kiến:** `apps/web/src/i18n/vi/common.json`, `apps/web/src/i18n/en/common.json`, `apps/web/src/styles/global.css`, `e2e/theme-i18n.spec.ts`, `tasks/visual-audit.md`.

**Scope:** M.

### Task 25: E2E, seed và local operations

**Mô tả:** Hoàn thiện Playwright journeys, deterministic seed và README cho setup/run/test.

**Acceptance criteria:**

- [ ] E2E bao phủ auth, schedule/suggestions, workout/calorie, body weight và preferences.
- [ ] Seed tạo system exercises/dữ liệu demo idempotently.
- [ ] Máy mới chạy được dự án theo README mà không cần secret thật.

**Verification:**

- [ ] `npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build`.
- [ ] Thực hiện clean local setup theo README.

**Dependencies:** Task 22, Task 24.

**Files dự kiến:** `e2e/auth.spec.ts`, `e2e/workout.spec.ts`, `e2e/body-weight.spec.ts`, `apps/api/src/scripts/seed.ts`, `README.md`.

**Scope:** M.

## Definition of Done

- [ ] Acceptance criteria của task đạt và có bằng chứng verification.
- [ ] Không bỏ qua hoặc xóa test để làm pipeline xanh.
- [ ] Contract/schema và tài liệu cập nhật cùng behavior.
- [ ] Dữ liệu cá nhân luôn enforce ownership.
- [ ] Không commit secret hoặc token.
- [ ] Lint, typecheck, test liên quan và build đều xanh.
- [ ] UI change được kiểm tra vi/en, light/dark và mobile.
