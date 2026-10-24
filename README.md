# SalesTrack Backend

REST API cho hệ thống quản lý doanh số SalesTrack. Dự án sử dụng Express, TypeScript, MongoDB/Mongoose và xác thực bằng JWT.

## Yêu cầu

- Node.js 20 trở lên
- npm
- MongoDB local hoặc MongoDB Atlas

## Cài đặt và chạy local

```bash
npm install
Copy-Item .env.example .env
npm run dev
```

Trên macOS/Linux, thay lệnh sao chép file môi trường bằng:

```bash
cp .env.example .env
```

Sau khi cập nhật các giá trị trong `.env`, API mặc định chạy tại `http://localhost:3001`. Kiểm tra trạng thái server:

```bash
curl http://localhost:3001/api/health
```

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|---:|---|
| `NODE_ENV` | Không | Môi trường chạy, mặc định nên dùng `development` khi chạy local |
| `PORT` | Không | Cổng của API, mặc định `3001` |
| `MONGODB_URI` | Có | Chuỗi kết nối MongoDB |
| `JWT_SECRET` | Có | Khóa ký JWT; nên dùng chuỗi ngẫu nhiên dài ít nhất 32 ký tự |
| `JWT_EXPIRES_IN` | Không | Thời hạn JWT, ví dụ `7d` |
| `CORS_ORIGIN` | Có khi production | Danh sách origin frontend, phân tách bằng dấu phẩy |
| `DEFAULT_ADMIN_USERNAME` | Khi seed | Tên đăng nhập của tài khoản admin ban đầu |
| `DEFAULT_ADMIN_PASSWORD` | Khi seed | Mật khẩu của tài khoản admin ban đầu |
| `DEFAULT_ADMIN_FULLNAME` | Khi seed | Tên hiển thị của tài khoản admin ban đầu |

Xem mẫu đầy đủ tại `.env.example`. Không commit file `.env` hoặc thông tin đăng nhập thật vào Git.

## Khởi tạo dữ liệu

Tạo tài khoản admin và danh mục sản phẩm mặc định (script có thể chạy lại an toàn):

```bash
npm run seed
```

Nhập dữ liệu từ file Excel sau khi đã chạy seed:

```bash
npm run migrate-excel -- "../HOP KQBH 2024.xlsx" 2024
```

## Các lệnh npm

| Lệnh | Chức năng |
|---|---|
| `npm run dev` | Chạy development server và tự khởi động lại khi mã nguồn thay đổi |
| `npm run build` | Biên dịch TypeScript vào thư mục `dist` |
| `npm start` | Build rồi chạy production server |
| `npm run typecheck` | Kiểm tra kiểu dữ liệu mà không tạo file build |
| `npm run lint` | Kiểm tra mã nguồn bằng ESLint |
| `npm run seed` | Tạo admin và dữ liệu sản phẩm mặc định |
| `npm run migrate-excel -- <file> <year>` | Nhập khách hàng và doanh số từ Excel |

## API

Ngoại trừ health check và đăng nhập, các endpoint yêu cầu JWT qua header:

```http
Authorization: Bearer <token>
```

| Nhóm | Base path | Chức năng chính |
|---|---|---|
| Health | `GET /api/health` | Kiểm tra trạng thái API |
| Auth | `/api/auth` | Đăng nhập, đăng xuất, hồ sơ và đổi mật khẩu |
| Customers | `/api/customers` | Tra cứu và quản lý khách hàng |
| Products | `/api/products` | Tra cứu, quản lý sản phẩm và nhóm sản phẩm |
| Sales entries | `/api/sales-entries` | Nhập, sửa, xóa và import doanh số |
| Reports | `/api/reports` | Báo cáo theo sản phẩm/khách hàng và xuất Excel |
| Users | `/api/users` | Quản lý người dùng (admin) |
| Audit | `/api/audit` | Xem nhật ký thao tác (admin) |

Các thao tác quản trị như tạo/sửa/xóa khách hàng, sản phẩm, người dùng và import Excel yêu cầu tài khoản có role `admin`.

## Cấu trúc thư mục

```text
src/
├── config/       # Kết nối cơ sở dữ liệu
├── controllers/  # Xử lý HTTP request/response
├── middlewares/  # Xác thực, phân quyền và xử lý lỗi
├── models/       # Mongoose models
├── routes/       # Khai báo API routes
├── schemas/      # Validation schemas
├── scripts/      # Seed và migration dữ liệu
├── services/     # Nghiệp vụ ứng dụng
├── types/        # Type declarations
├── utils/        # Tiện ích dùng chung
└── server.ts     # Entry point
```

## Quy ước dữ liệu tiền tệ

- `planAmount` và `actualAmount` được lưu theo đơn vị **triệu VND**.
- `unitPrice` được lưu theo đơn vị **VND**.
- Doanh thu thực tế được tính theo công thức: `actualAmount = quantity * unitPrice / 1_000_000`.

## Deploy lên Render

Repository đã có `render.yaml`. Khi tạo service trên Render, cần cung cấp tối thiểu `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN` và các biến `DEFAULT_ADMIN_*` nếu muốn chạy seed. Health check dùng endpoint `/api/health`.

Trước khi đưa lên production, hãy dùng mật khẩu admin mạnh, tạo `JWT_SECRET` riêng và giới hạn `CORS_ORIGIN` đúng domain của frontend.
