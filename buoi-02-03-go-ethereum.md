<!-- page 1 of 58 -->

**Go Ethereum**

**MetaMask**

**Hardhat**

**Understand and Use**

**Go Ethereum**

Buổi 2 & 3 :  6 tiết (3 LT / 3 TH)  - Dựng mạng blockchain riêng và vận hành nó

① Overview & Install

② Nodes & Accounts

③ Genesis

④ Add peers

⑤ Validating tx

Học phần Blockchain  |  Buổi 2 & 3 / 15

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đây là deck gộp của hai buổi liên tiếp, cùng một chủ đề trong đề cương.<br>Buổi 2 (2LT/1TH) kết thúc ở Mốc kiểm tra 2 — slide “Mạng của bạn đã sống”.<br>Buổi 3 (1LT/2TH) bắt đầu từ slide phân cách PHẦN B.<br>Nguyên tắc suốt hai buổi: giảng viên gõ trên máy chiếu, sinh viên gõ theo, không ai đi trước.<br>Chuẩn bị: USB hoặc link chứa genesis.json mẫu và bản cài geth offline cho sinh viên mạng yếu.</span></small>

<!-- page 2 of 58 -->

## **Chuẩn đầu ra của hai buổi**

Đây là thước đo để tự chấm cuối buổi

**Buổi 2: Understand and Use Go Ethereum**

•  Cài đặt được công cụ Go Ethereum

•  Cấu hình cây thư mục dự án và tạo được accounts cho từng node

•  Hiểu các thông số trong tệp genesis.json và cấu hình khối genesis cho mạng lưới

•  Khởi tạo được khối genesis và chạy các nodes

**Buổi 3: Go Ethereum (continue)**

•  Thêm được các node chạy ngang hàng để khai thác mạng blockchain

•  Kết nối được với môi trường phát triển Hardhat và nhúng vào trình duyệt với ví MetaMask

•  Xác định được một giao dịch có tuân thủ các yêu cầu giao thức để được coi là hợp lệ

**Sản phẩm cuối hai buổi**

Một mạng blockchain của riêng bạn chạy trên chính máy bạn: 2 node nói chuyện được với nhau, tự sinh block mỗi 5 giây, ví MetaMask cắm vào dùng được ngay, Hardhat kết nối được, và bạn đã gửi giao dịch hai chiều rồi đọc được biên nhận của nó.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đọc to phần chuẩn đầu ra. Sinh viên cần biết mình sẽ bị đánh giá theo tiêu chí nào.<br>Thời lượng: 4 phút. Đừng sa đà, đích đến cụ thể nằm ở thẻ vàng phía dưới.</span></small>

<!-- page 3 of 58 -->

## **Nội dung buổi học 2 và 3**

Luôn quay lại slide này khi không biết mình đang ở đâu

**BUỔI 2:  Dựng mạng**

1.  Go Ethereum overview

2.  Install Go Ethereum

3.  Create directory for each node

4.  Create accounts for each node

5.  Create and config Genesis file

6.  Initialize Genesis block in node directories

7.  Launching nodes

**BUỔI 3:  Vận hành mạng**

1.  Add peers

2.  Connecting to Geth network

3.  Validating a transaction

**Vì sao buổi 3 ít mục hơn?**

Buổi 2 là 2 tiết lý thuyết + 1 tiết thực hành: nhiều bước nhỏ, mỗi bước một lệnh.

Buổi 3 là 1 lý thuyết + 2 thực hành: ít mục hơn nhưng mỗi mục dài và nặng tay hơn.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 3 phút. In slide này ra giấy phát cho lớp thì càng tốt.</span></small>

<!-- page 4 of 58 -->

## **Quy ước trước khi gõ lệnh**

**1**

**2**

**3**

**4**

**Terminal mở ở đâu?**

Windows: Start, gõ “PowerShell”. macOS: Cmd+Space, gõ “Terminal”. Linux: Ctrl+Alt+T.

**Dấu # là chú thích**

Không cần gõ. Chỉ gõ những dòng không bắt đầu bằng #.

**Dấu \ cuối dòng = lệnh còn tiếp**

Trên PowerShell dùng dấu \` thay cho \, hoặc gõ tất cả trên một dòng dài.

**Chữ trong <> phải thay bằng giá trị của bạn**

Gõ cả dấu <> vào là sai.

**Luôn kiểm tra bạn đang ở thư mục nào**

Gõ pwd (macOS/Linux) hoặc cd (Windows) để xem thư mục hiện tại.

Hầu hết lỗi “không tìm thấy tệp” trong hai buổi này chỉ vì bạn đang đứng sai thư mục.

Ví dụ

\$ pwd

/Users/thy/Desktop/private-net

\# dung thu muc -> gõ lệnh tiếp theo

💡  Mẹo: bấm phím mũi tên lên trong terminal để cuộn lại các lệnh đã gõ, không phải gõ lại từ đầu.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đọc kỹ từng dòng cho lớp. Thời lượng: 5 phút. Slide này cứu rất nhiều câu hỏi lặp lại.</span></small>

<!-- page 5 of 58 -->

## **Đối chiếu lệnh: Windows và macOS / Linux**

| Việc cần làm | macOS / Linux | Windows PowerShell |
| --- | --- | --- |
| Xem đang ở thư mục nào | pwd | pwd hoặc cd |
| Liệt kê tệp trong thư mục | ls -la | ls hoặc dir |
| Tạo thư mục | mkdir private-net | mkdir private-net |
| Đi vào / quay ra thư mục | cd private-net · cd .. | cd private-net · cd .. |
| Tạo tệp văn bản có nội dung | echo "abc" > password.txt | echo "abc" > password.txt |
| Xem nội dung tệp | cat genesis.json | type genesis.json |
| Xoá cả thư mục | rm -rf node1/geth | Remove-Item -Recurse -Force node1\\geth |
| Nối nhiều dòng thành một lệnh | dấu \\ ở cuối dòng | dấu ` ở cuối dòng |

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 2 phút. SLIDE TUỲ CHỌN — nên IN RA GIẤY phát cho lớp thay vì chiếu, để tiết kiệm thời gian.<br>Nếu đã phát giấy thì bỏ hẳn slide này khi trình chiếu.</span></small>

<!-- page 6 of 58 -->

**PHẦN A:  BUỔI 2 (2 LT/1 TH)**

## **Understand and Use Go Ethereum**

Từ cài công cụ đến chạy được node đầu tiên

Overview

Install

Directories

Accounts

Genesis

Init

Launch

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Bắt đầu buổi 2. Nhắc sinh viên tắt ứng dụng nặng để máy không ì.</span></small>

<!-- page 7 of 58 -->

## **Ôn tập 5 phút: nhắc lại từ buổi 1**

Năm điều dưới đây là nền cho toàn bộ hai buổi thực hành

**Mục 1**

**1**

**2**

**3**

**4**

**5**

**Blockchain là một quyển sổ được nhân bản trên nhiều máy**

Mỗi máy giữ một bản sao gọi là node. Hôm nay bạn chạy 2 node trên cùng một máy tính.

**Block là một “trang sổ”, được nối bằng mã băm**

Mỗi block ghi mã băm của block trước (parentHash). Sửa block cũ là gãy cả chuỗi.

**Block đầu tiên gọi là khối genesis**

Nó không có block trước. Hôm nay bạn tự viết nội dung khối genesis cho mạng của mình.

**Phải có cơ chế chọn ai được ghi block**

Mạng của lớp dùng Proof of Authority: một máy được chỉ định trước sẽ ký các block.

**Ai giữ khoá riêng thì làm chủ tài sản**

Hôm nay bạn tạo khoá bằng geth account new. Khoá được mã hoá và lưu trong thư mục keystore.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Hỏi nhanh, gọi vài sinh viên trả lời. Nếu lớp quên nhiều thì giảng lại 10 phút rồi mới thực hành. Thời lượng: 5 phút.</span></small>

<!-- page 8 of 58 -->

## **Go Ethereum (geth) là gì?**

Hiểu bằng cách so với thứ bạn dùng hằng ngày: trình duyệt web

**Mục 1**

| Trong đời thường | tương ứng | Trong blockchain |
| --- | --- | --- |
| Muốn xem web bạn cần cài trình duyệt Chrome | tương ứng | Muốn tham gia mạng Ethereum bạn cần cài phần mềm node. geth là một trong số đó |
| Chrome tải trang web về và hiển thị cho bạn | tương ứng | geth tải các block về, kiểm tra tính hợp lệ và lưu lại trên máy bạn |
| Ngoài Chrome còn có Firefox, Safari | tương ứng | Ngoài geth còn có Nethermind, Besu, Erigon — khác ngôn ngữ nhưng cùng chuẩn |
| Chrome mở cổng để các trang web gọi tới | tương ứng | geth mở cổng 8545 để MetaMask, Hardhat hay chương trình của bạn gọi vào |

📦  geth viết bằng ngôn ngữ Go, do Ethereum Foundation phát triển, mã nguồn mở và miễn phí. Cổng 8545 ở dòng cuối là thứ buổi 3 sẽ dùng để cắm MetaMask và Hardhat vào.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Giải thích ngắn gọn: geth là “phần mềm để làm một node”. Đừng sa đà vào kiến trúc. Thời lượng: 6 phút.</span></small>

<!-- page 9 of 58 -->

## **Hình dung trước: ta sắp dựng cái gì?**

**Mục 1**

Vẽ bức tranh này lên bảng — sinh viên hay nhầm ở đúng chỗ này

**private-net/**

Thư mục dự án.

Bên trong chứa genesis.json dùng chung và hai thư mục con của từng node.

**private-net/node1**

Node 1 — máy ký block.

Có tài khoản riêng, dữ liệu chuỗi riêng. Đây là node được quyền tạo block mới.

**private-net/node2**

Node 2 — máy thường.

Có tài khoản riêng, chỉ nhận và kiểm tra block do node 1 tạo ra.

**ĐIỀU QUAN TRỌNG NHẤT CẦN NHỚ**

Mỗi node là một thư mục riêng biệt và một tiến trình geth riêng biệt, chạy trên một cửa sổ terminal riêng. Hai node KHÔNG được dùng chung thư mục — nhưng cả hai PHẢI khởi tạo từ CÙNG MỘT tệp genesis.json.

⚠️  Lỗi phổ biến nhất: chạy hai node cùng trỏ vào một --datadir. Khi đó node thứ hai báo lỗi khoá cơ sở dữ liệu và không lên được.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Vẽ lên bảng: 1 thư mục cha, bên trong 2 thư mục con, chung một tệp genesis. Thời lượng: 5 phút.</span></small>

<!-- page 10 of 58 -->

## **Vì sao lớp dùng geth bản 1.13?**

Đọc slide này trước khi tải phần mềm — tải nhầm bản là cả buổi không chạy được

**Mục 2**

### **1**

### **2**

### **3**

### **4**

### **Tháng 9/2022, Ethereum đổi cơ chế đồng thuận**

Sự kiện “The Merge”: mạng chính chuyển từ Proof of Work sang Proof of Stake.

### **geth không còn tự tạo block nữa**

Từ đó geth chỉ còn là execution client, phải ghép với một consensus client riêng mới sinh được block.

### **Clique bị khai tử theo**

Clique là cơ chế PoA cho mạng riêng. Nó bị đánh dấu “đã lỗi thời” từ geth v1.14 và bản mới KHÔNG ký được block Clique.

### **Nên lớp ghim bản 1.13.15**

Đây là bản cuối còn ký được block Clique. Tải từ repo lớp, đừng tải bản mới nhất ở trang chủ.

### **Tải ở đâu?**

1. link: https://geth.ethereum.org/downloads

2. Keo xuong muc Stable releases

-> bam "Show older releases"

-> chon tab HDH cua ban

-> tim dong  Geth 1.13.15

3. Ghi chu phat hanh (tuy chon):

github.com/ethereum/go-ethereum/

releases/tag/v1.13.15

### **Tên tệp trông như thế nào?**

geth-linux-amd64-1.13.15-<8 ký tự>.tar.gz

Tám ký tự cuối là mã commit, mỗi bản một khác — cứ bấm đúng dòng 1.13.15 trên trang, đừng gõ tay URL.

⚠️  Tải bản 1.14 trở lên: node chạy được nhưng KHÔNG BAO GIỜ in “Successfully sealed new block”. Cả buổi 2 và 3 sẽ tắc.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 6 phút. Slide bắt buộc, không bỏ được.<br>Đây vừa là cảnh báo kỹ thuật vừa là bài học lịch sử: The Merge đã thay đổi kiến trúc client như thế nào.<br>Kiểm tra tại chỗ: bắt cả lớp gõ geth version và đọc to số phiên bản trước khi đi tiếp.<br>Nguồn: tài liệu chính thức go-ethereum ghi rõ Clique deprecated từ v1.14 và geth hiện chỉ hoạt động ở chế độ PoS.</span></small>

<!-- page 11 of 58 -->

## **Cài đặt geth 1.13.15 trên máy**

Chọn đúng phần cho hệ điều hành của bạn , chỉ làm MỘT trong ba khối

### **Mục 2**

Cài đặt theo hệ điều hành

\# ==== macOS (Apple: darwin-arm64 | Intel: amd64) ====

cd \~/Downloads

tar -xzf geth-darwin-\*-1.13.15-\*.tar.gz

sudo mv geth-darwin-\*-1.13.15-\*/geth /usr/local/bin/

sudo xattr -d com.apple.quarantine /usr/local/bin/geth

\#   ^ go canh bao "ung dung chua xac minh"

\# ================= Linux =================

cd \~/Downloads

tar -xzf geth-linux-amd64-1.13.15-\*.tar.gz

sudo mv geth-linux-amd64-1.13.15-\*/geth /usr/local/bin/

\# ================ Windows ================

\# 1. Giai nen tep .zip vao thu muc  C:\geth

\# 2. Start -> "environment variables" -> Path

\#    -> New -> them  C:\geth

\# 3. DONG HAN PowerShell roi mo lai cua so moi

Kết quả mong đợi

Kiem chung ngay sau khi cai:

\$ geth version

Geth

Version: 1.13.15-stable

Va thu o mot thu muc khac:

\$ cd \~

\$ geth version

-> van chay = PATH da dung

Neu chi chay duoc khi dung

trong thu muc vua giai nen

thi PATH CHUA dung.

Mục tiêu của bước cài đặt: gõ geth ở BẤT KỲ thư mục nào cũng chạy được. Muốn vậy phải đưa tệp geth vào một thư mục nằm trong biến môi trường PATH.

**⚠  Windows: cài xong vẫn command not found**  bạn chưa đóng hẳn PowerShell. Biến PATH chỉ được nạp khi mở cửa sổ mới.

**⚠  macOS: “geth cannot be opened because the developer cannot be verified”**  chạy dòng xattr ở trên, hoặc System Settings rồi Privacy & Security, chọn Allow Anyway.

**⚠  Không có quyền sudo (máy phòng máy)**  giải nén vào thư mục của bạn rồi thêm thư mục đó vào PATH thay vì chép vào /usr/local/bin.

**⚠  ĐỪNG dùng brew install ethereum hay apt install geth**  hai cách này luôn kéo bản mới nhất, tức bản không ký được block Clique. Chỉ dùng tệp tải từ trang chính thức.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 12 phút. Slide thực hành đầu tiên của buổi 2.<br>Chia lớp theo hệ điều hành, đi từng nhóm. Máy Windows thường lâu nhất vì phần PATH.<br>MẸO: cho một sinh viên đã cài xong ở mỗi nhóm làm trợ giảng cho các bạn cùng hệ điều hành.<br>Nhấn phép thử ở cột phải: cd về thư mục nhà rồi gõ lại geth version. Đây mới là bằng chứng PATH đã đúng.<br>Nếu trang tải không còn bản 1.13.15, dùng bản dự phòng giảng viên đã lưu — báo lớp ngay đầu buổi.</span></small>

<!-- page 12 of 58 -->

## **Bước 1: Kiểm tra geth đã cài đúng chưa**

Nếu bước này lỗi thì mọi bước sau đều lỗi

**Mục 2**

Mở terminal và gõ lệnh dưới đây. Lệnh này chỉ hỏi geth “bạn là phiên bản mấy”, không thay đổi gì trên máy.

Gõ lệnh này

geth version

Kết quả mong đợi

Geth

Version: 1.13.15-stable

Architecture: amd64

Go Version: go1.21.x

Operating System: darwin

...

So phien ban PHAI bat dau

bang 1.13 - xem slide truoc

**⚠  Hiện 1.14 / 1.15 / 1.16**  SAI BẢN. Gỡ tệp geth đang có ra, tải lại đúng 1.13.15 theo hai slide trước. Bản mới không ký được block Clique.

**⚠  command not found**  geth chưa vào PATH. Quay lại slide cài đặt, làm lại bước đưa geth vào thư mục trong PATH rồi MỞ LẠI terminal.

**⚠  Ghi lại số phiên bản của bạn vào vở**  cuối buổi nếu có lỗi lạ, việc đầu tiên giảng viên hỏi sẽ là “geth version của em ra bao nhiêu?”.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đi từng bàn kiểm tra SỐ PHIÊN BẢN, không chỉ kiểm tra lệnh có chạy không.<br>Ai lỡ cài bản mới thì gỡ ngay tại chỗ — để trôi sang bước 7 mới phát hiện là mất cả buổi.<br>KHÔNG dùng brew/apt/choco cho môn này: chúng luôn cài bản mới nhất. Chỉ dùng binary trong repo lớp.<br>Thời lượng: 10 phút.</span></small>

<!-- page 13 of 58 -->

## **Bước 2: Tạo thư mục cho từng node**

Tổ chức nơi làm việc cho gọn gàng trước khi tạo ví

**Mục 3**

Tạo thư mục private-net trên Desktop, bên trong có hai thư mục con node1 và node2, rồi đi vào private-net.

Gõ lệnh này

cd Desktop

mkdir private-net

cd private-net

mkdir node1

mkdir node2

ls

Kết quả mong đợi

node1    node2

\# go pwd se thay duong dan

\# ket thuc bang:

\#   .../Desktop/private-net

**⚠  No such file or directory khi cd Desktop**  máy bạn dùng tên khác, thử cd \~/Desktop hoặc tạo thư mục ở nơi khác cũng được.

**⚠  Lỡ tạo nhầm chỗ**  gõ cd .. để lùi ra rồi làm lại, hoặc kéo thả thư mục bằng chuột.

**⚠  Nhớ kỹ**  từ giờ đến hết hai buổi, terminal phải luôn đứng ở thư mục private-net. Kiểm tra bằng pwd.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Yêu cầu tất cả tạo ở cùng một chỗ (Desktop) để sau này dễ hỗ trợ. Thời lượng: 5 phút.</span></small>

<!-- page 14 of 58 -->

## **Bước 3: Tạo tệp mật khẩu**

Dùng để mở khoá ví mà không phải gõ tay mỗi lần

**Mục 3**

Tạo tệp password.txt chứa mật khẩu cho các ví trong mạng học tập. Mật khẩu này rất yếu — chấp nhận được vì đây chỉ là mạng thử trên máy bạn.

Gõ lệnh này

echo "matkhaulop" > password.txt

\# Kiem tra noi dung (macOS/Linux)

cat password.txt

\# Windows

type password.txt

Kết quả mong đợi

matkhaulop

**⚠  Tệp có dấu ngoặc kép trong nội dung**  mở bằng Notepad hoặc VS Code, xoá dấu ngoặc, chỉ để lại matkhaulop rồi lưu.

**⚠  TUYỆT ĐỐI không đưa tệp này lên GitHub**  cuối buổi sẽ hướng dẫn tạo .gitignore để loại nó ra.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Giải thích vì sao cần: geth sẽ hỏi mật khẩu khi tạo ví; đưa sẵn tệp để đỡ gõ tay và tránh gõ sai. Thời lượng: 4 phút.</span></small>

<!-- page 15 of 58 -->

## **Bước 4a: Tạo tài khoản node 1**

Sinh cặp khoá mới và lưu vào node1/keystore

**Mục 4**

HÃY CHÉP LẠI ĐỊA CHỈ HIỆN RA vào một tệp ghi chú — bước 5 sẽ dùng đến. Địa chỉ của mỗi người là duy nhất, không ai giống ai.

Gõ lệnh này

geth account new --datadir node1 \

--password password.txt

\# Xem lai danh sach bat cu luc nao

geth account list --datadir node1

Kết quả mong đợi

Your new key was generated

Public address of the key:

0x9aE1b4C7fD3e08A5c21B6f0d94E

7a3B85C2d16Fa

Path of the secret key file:

node1/keystore/UTC--2026-...

(Dia chi cua ban se KHAC)

**⚠  Fatal: could not decrypt key**  tệp password.txt có ký tự lạ. Tạo lại tệp bằng VS Code.

**⚠  Không thấy thư mục keystore**  kiểm tra bạn đang đứng ở private-net chứ không phải trong node1.

**⚠  Lỡ tạo nhiều tài khoản**  không sao, chỉ dùng địa chỉ đầu tiên và bỏ qua các địa chỉ còn lại.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Nhấn: địa chỉ hiện ra là DUY NHẤT trên máy mỗi người. Bắt sinh viên chép lại ngay vào ghi chú. Thời lượng: 8 phút.</span></small>

<!-- page 16 of 58 -->

## **Bước 4b: Tạo tài khoản node 2**

Làm lại đúng như bước 4a nhưng đổi node1 thành node2

**Mục 4**

Sau bước này bạn phải có ghi chú gồm HAI địa chỉ ví KHÁC NHAU. Hai địa chỉ giống hệt nhau là dấu hiệu bạn gõ nhầm --datadir node1 hai lần.

Gõ lệnh này

geth account new --datadir node2 \

--password password.txt

\# Xem lai ca hai dia chi

geth account list --datadir node1

geth account list --datadir node2

Kết quả mong đợi

Account #0: {9ae1b4c7fd3e08a5

c21b6f0d94e7a3b85c2d16fa}

keystore:///.../node1/...

Account #0: {3f72ad91ce05b8d4

a6f1e2c7b93d0a85fe64c2db}

keystore:///.../node2/...

**⚠  Hai địa chỉ giống hệt nhau**  xoá thư mục node2/keystore rồi làm lại bước này cho đúng.

**⚠  Lưu ý**  trong danh sách, địa chỉ hiện ra KHÔNG có tiền tố 0x. Khi dùng ở nơi khác nhớ thêm 0x vào đầu.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Làm y hệt, chỉ đổi node1 thành node2. Nhắc chép địa chỉ thứ hai. Thời lượng: 5 phút.</span></small>

<!-- page 17 of 58 -->

## **Hiểu thêm: bạn vừa tạo ra cái gì?**

Dừng gõ lệnh 3 phút. Sinh viên cần hiểu chứ không chỉ gõ

**Mục 4**

**1**

**2**

**3**

**4**

**5**

**Một khoá riêng tư 256 bit được sinh ngẫu nhiên**

Đây là “chìa khoá” thật sự. Nó không được lưu thô mà được mã hoá bằng mật khẩu bạn đưa vào.

**Một tệp trong thư mục keystore**

Tên dạng UTC--2026-08-27T...--<địa chỉ>. Mở ra thấy JSON đã mã hoá, không đọc được bằng mắt.

**Một địa chỉ ví công khai**

Sinh ra từ khoá riêng, dùng để nhận tiền. Đây là thứ bạn chép lại và sẽ đưa vào genesis.json.

**Muốn dùng ví phải có ĐỦ hai thứ**

Tệp keystore + mật khẩu. Mất một trong hai là mất ví vĩnh viễn — trên mạng thật không ai lấy lại được cho bạn.

**Vì sao mạng thật lại an toàn?**

Kẻ tấn công phải lấy được tệp keystore trên máy bạn VÀ đoán được mật khẩu. Đó là lý do mật khẩu ví thật phải rất mạnh.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Dừng thực hành để giải thích. Đây là kiến thức bảo mật dùng lại suốt học phần. Thời lượng: 6 phút.</span></small>

<!-- page 18 of 58 -->

## **Bước 5: genesis.json khai báo gì?**

Hiểu từng dòng trước khi gõ. Chỉ copy-paste thì bạn sẽ không sửa được khi lỗi

**Mục 5**

| Dòng trong tệp | Nghĩa dễ hiểu | Bạn điền gì |
| --- | --- | --- |
| chainId | Số hiệu riêng của mạng bạn, để không lẫn với mạng khác | 12345 (số bất kỳ, miễn không phải 1 hay 11155111) |
| ...Block: 0 | Bật tất cả bản nâng cấp của Ethereum ngay từ block 0 | Giữ nguyên như mẫu, không cần sửa |
| clique.period | Bao nhiêu giây sinh ra một block | 5 (mỗi 5 giây một block) |
| difficulty | Độ khó — mạng PoA không cần khó | Giữ nguyên "0x1" |
| gasLimit | Trần công sức tính toán cho mỗi block | Giữ nguyên "0x1C9C380" (30 triệu) |
| extradata | Khai báo AI được quyền ký block | Ghép từ địa chỉ node 1 — slide sau hướng dẫn |
| alloc | Ai có sẵn bao nhiêu tiền ngay từ đầu | Địa chỉ node1 và node2, mỗi ví 1000 ETH |

📜  genesis.json giống “giấy khai sinh” của mạng. Khai sinh xong thì không sửa được nữa — muốn sửa phải xoá dữ liệu chuỗi và khai sinh lại từ đầu.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Giải thích từng dòng trước khi cho gõ. Thời lượng: 8 phút.</span></small>

<!-- page 19 of 58 -->

## **Bước 5: Cách điền extradata**

Đây là chỗ 80% sinh viên làm sai. Làm mẫu thật chậm trên máy chiếu

**Khó nhất**

Công thức

extradata  =  64 so 0   +   dia chi node1 (bo 0x)   +   130 so 0

Vi du dia chi node1:  0x9aE1b4C7fD3e08A5c21B6f0d94E7a3B85C2d16Fa

Buoc 1 - bo tien to 0x   ->  9aE1b4C7...C2d16Fa   (40 ky tu)

Buoc 2 - viet 0x roi 64 so 0

Buoc 3 - dan dia chi vao ngay sau

Buoc 4 - them tiep 130 so 0 o cuoi

Ket qua: mot chuoi lien mach, KHONG xuong dong, KHONG khoang trang

### **Mẹo kiểm tra nhanh**

Tổng độ dài chuỗi (không tính 0x) phải đúng 234 ký tự = 64 + 40 + 130.

Dán vào Word để đếm ký tự, hoặc dùng Python: len(chuoi).

### **Sai ở đây sẽ báo lỗi gì?**

Lệnh geth init ở bước 6 sẽ dừng với "invalid extradata length".

Nếu địa chỉ nhúng sai, node chạy được nhưng không bao giờ ký block.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">ĐÂY LÀ SLIDE QUAN TRỌNG NHẤT BUỔI 2. Làm mẫu trên máy chiếu với một địa chỉ cụ thể, gõ thật chậm.<br>Cho sinh viên đếm ký tự cùng nhau. Thời lượng: 12 phút — đừng tiếc thời gian ở đây.</span></small>

<!-- page 20 of 58 -->

## **Bước 5: Viết tệp genesis.json**

Mở VS Code, tạo tệp genesis.json trong thư mục private-net

### **Mục 5**

genesis.json

{

"config": { "chainId": 12345,

"homesteadBlock":0,"eip150Block":0,"eip155Block":0,

"eip158Block":0,"byzantiumBlock":0,"petersburgBlock":0,

"constantinopleBlock":0,"istanbulBlock":0,

"berlinBlock":0,"londonBlock":0,

"clique": { "period": 5, "epoch": 30000 } },

"difficulty": "0x1",

"gasLimit": "0x1C9C380",

"extradata": "0x&lt;CHUOI_EXTRADATA&gt;",

"alloc": {

"&lt;NODE1_KHONG_0x&gt;": { "balance": "1000000000000000000000" },

"&lt;NODE2_KHONG_0x&gt;": { "balance": "1000000000000000000000" }

}

}

Kết quả mong đợi

Kiem tra sau khi luu:

\- Tep genesis.json nam trong

thu muc private-net/

\- VS Code khong gach chan do

dong nao

\- So du 1000 ETH phai du

22 chu so

Chép nội dung bên trái, thay 3 chỗ IN HOA bằng dữ liệu của bạn. Trong alloc và extradata, địa chỉ đều KHÔNG có 0x.

**⚠  Gạch chân đỏ trong VS Code**  thiếu hoặc thừa dấu phẩy. Dán vào jsonlint.com để tìm chỗ sai.

**⚠  Địa chỉ trong alloc có 0x**  bỏ tiền tố 0x đi — trong alloc và extradata đều không có 0x.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Cho sinh viên tải tệp mẫu từ repo lớp rồi chỉ sửa 3 chỗ, sẽ nhanh và ít lỗi hơn gõ tay. Thời lượng: 10 phút.</span></small>

<!-- page 21 of 58 -->

## **Bước 6: Khởi tạo khối genesis**

geth init đọc genesis.json và tạo ra block số 0 trong thư mục dữ liệu

### **Mục 6**

Chạy lần lượt cho cả hai node. Mã băm hash= in ra của node1 và node2 PHẢI GIỐNG HỆT NHAU — nếu khác, hai node sẽ không bao giờ nói chuyện được.

Gõ lệnh này

geth init --datadir node1 genesis.json

geth init --datadir node2 genesis.json

Kết quả mong đợi

INFO [08-27|09:15:22.101]

Successfully wrote genesis state

database=chaindata

hash=5e1fc7..a93b21

(hash cua node1 va node2

PHAI GIONG HET NHAU)

**⚠  invalid character / unexpected end of JSON**  genesis.json sai cú pháp. Dán vào jsonlint.com để tìm chỗ sai.

**⚠  invalid extradata length**  chuỗi extradata thừa hoặc thiếu ký tự. Đếm lại: đúng 234 ký tự sau 0x.

**⚠  open genesis.json: no such file**  bạn không đứng ở thư mục private-net. Gõ pwd để kiểm tra.

**⚠  Muốn làm lại từ đầu**  xoá node1/geth và node2/geth (giữ nguyên keystore) rồi init lại.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Chạy cho cả hai node. Nhấn mạnh: hai mã băm in ra phải GIỐNG HỆT nhau. Thời lượng: 6 phút.</span></small>

<!-- page 22 of 58 -->

## **Mốc kiểm tra 1: trước khi bật mạng**

Chưa đạt hết các mục dưới đây thì đừng đi tiếp

**Dừng lại**

**Đến đây bạn phải có được**

private-net chứa: genesis.json, password.txt, node1/, node2/

Có hai địa chỉ ví KHÁC NHAU, đã chép ra ghi chú

node1/ và node2/ đều có thư mục keystore VÀ thư mục geth

Hai lệnh geth init đều in “Successfully wrote genesis state”

Hai mã băm hash= của node1 và node2 giống hệt nhau

### **Nếu chưa đạt mốc này**

Đừng đi tiếp. Xoá hai thư mục node1/geth và node2/geth rồi làm lại từ bước 5.

Giơ tay để giảng viên hỗ trợ — lỗi ở đây gần như luôn chỉ là một dấu phẩy trong JSON hoặc thiếu vài số 0 trong extradata.

➡️  Đến đây mạng của bạn đã “khai sinh” xong nhưng chưa chạy. Bước cuối cùng là bật nó lên.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Dừng thật, đi một vòng lớp. Không cho ai đi tiếp khi chưa đạt mốc này. Thời lượng: 8 phút.</span></small>

<!-- page 23 of 58 -->

## **Bước 7a: Khởi chạy node 1 (máy ký block)**

Lệnh dài nhất buổi học — nên chép từ repo lớp, chỉ thay địa chỉ

### **Mục 7**

Gõ nguyên khối lệnh vào terminal đang đứng ở private-net. Thay &lt;DIA_CHI_NODE1&gt; bằng địa chỉ ví node 1 CÓ tiền tố 0x. Cửa sổ này sẽ bị chiếm dụng — đừng đóng nó.

Gõ lệnh này

geth --datadir node1 --networkid 12345 \

--port 30303 --http --http.addr 127.0.0.1 \

--http.port 8545 \

--http.api eth,net,web3,admin,txpool,miner \

--http.corsdomain "\*" --authrpc.port 8551 \

--nodiscover --allow-insecure-unlock --mine \

--unlock &lt;DIA_CHI_NODE1&gt; \

--password password.txt \

--miner.etherbase &lt;DIA_CHI_NODE1&gt; console

Kết quả mong đợi

INFO Unlocked account address=0x9aE1...

INFO Starting mining operation

INFO Commit new sealing work number=1

INFO Successfully sealed new block

number=1

INFO Successfully sealed new block

number=2

...

Welcome to the Geth JavaScript console!

>

**⚠  Không thấy “Successfully sealed”**  địa chỉ trong --miner.etherbase không khớp địa chỉ đã nhúng trong extradata.

**⚠  could not decrypt key with given passphrase**  sai mật khẩu — kiểm tra lại nội dung password.txt.

**⚠  Windows báo lỗi ở dấu \**  gõ toàn bộ lệnh trên MỘT dòng duy nhất, cách nhau bằng dấu cách.

**⚠  address already in use**  đã có geth khác đang chạy. Đóng terminal cũ hoặc đổi --port và --http.port.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Cho sinh viên chép từ repo lớp thay vì gõ tay, chỉ thay địa chỉ. Thời lượng: 12 phút.</span></small>

<!-- page 24 of 58 -->

## **Từng tham số trong lệnh vừa rồi nghĩa là gì?**

**Mục 7**

| Tham số | Nghĩa dễ hiểu |
| --- | --- |
| --datadir node1 | Dùng thư mục node1 làm nơi chứa dữ liệu và ví của node này |
| --networkid 12345 | Chỉ nói chuyện với các node có cùng số hiệu mạng này |
| --port 30303 | Cổng để các node nói chuyện với nhau (P2P) |
| --http --http.port 8545 | Mở cửa cho MetaMask, Hardhat, chương trình của bạn gọi vào |
| --http.api eth,net,web3,... | Cho phép những nhóm lệnh nào được gọi từ bên ngoài |
| --nodiscover | Không tự đi tìm node lạ trên Internet — bắt buộc với mạng riêng |
| --unlock ... --password ... | Mở khoá ví sẵn để node ký block mà không hỏi mật khẩu |
| --mine --miner.etherbase ... | Bật chế độ tạo block, ghi phần thưởng vào địa chỉ này |
| --allow-insecure-unlock | Cho phép mở khoá ví khi HTTP-RPC đang bật — mặc định geth CẤM điều này |
| console | Mở luôn cửa sổ dòng lệnh JavaScript để bạn gõ lệnh tương tác |

🚨  Tổ hợp --allow-insecure-unlock + --http.corsdomain "\*" + nhóm lệnh admin,miner,txpool chỉ an toàn vì --http.addr là 127.0.0.1. Đổi thành 0.0.0.0 trên máy có IP công khai là mất sạch ví trong vài phút. Đừng bao giờ chép nguyên lệnh này lên máy chủ.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 6 phút. CÓ THỂ CHUYỂN THÀNH BÀI ĐỌC Ở NHÀ nếu cháy giờ — nhưng phải đọc to dải đỏ tại lớp.<br>Nhấn hai dòng --http.port 8545 và --http.api: buổi 3 sẽ dùng đúng hai thứ này.<br>Dải đỏ nối thẳng sang buổi 4 (bài học Ronin/Wormhole): cấu hình sai là mất tiền thật, không phải lỗi cú pháp.</span></small>

<!-- page 25 of 58 -->

## **Kỹ năng quan trọng: đọc nhật ký của geth**

Dạy từ buổi đầu vì đây là kỹ năng dùng suốt học phần

### **Mục 7**

Nhật ký geth — dòng nào nghĩa là gì

INFO  Unlocked account   address=0x9aE1b4C7...

-> Vi da mo khoa thanh cong, node san sang ky block

INFO  Commit new sealing work  number=1  txs=0  gas=0

-> Dang chuan bi block so 1, chua co giao dich nao (txs=0)

INFO  Successfully sealed new block  number=1  hash=a1b2c3..

-> DA TAO XONG block so 1. Day la dong ban can thay!

WARN  Block sealing failed  err="unauthorized signer"

-> Dia chi dang ky KHONG nam trong danh sach signer o extradata

ERROR Failed to unlock account  err="could not decrypt key"

-> Sai mat khau hoac sai tep keystore

🔍  Quy tắc đọc log: INFO là bình thường, WARN là cảnh báo cần xem, ERROR là hỏng phải sửa. Luôn đọc phần err="..." ở cuối dòng.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 6 phút. Bảo sinh viên cuộn lên nhật ký của chính máy mình và tìm đúng các dòng này.</span></small>

<!-- page 26 of 58 -->

## **Bước 7b: Mở terminal thứ hai, chạy node 2**

Node 2 không ký block nên lệnh ngắn hơn nhiều

### **Mục 7**

Mở một cửa sổ terminal MỚI — đừng đóng cửa sổ node 1 đang chạy. Đi vào private-net rồi chạy node 2 với các cổng KHÁC node 1.

Gõ lệnh này

cd Desktop/private-net

geth --datadir node2 --networkid 12345 \

--port 30304 \

--http --http.port 8546 \

--authrpc.port 8552 \

--nodiscover console

Kết quả mong đợi

Welcome to the Geth JavaScript console!

>

> eth.blockNumber

0

(Bang 0 la DUNG: node 2 chua noi

voi node 1 nen chua nhan duoc

block. Phan B se noi chung lai.)

**⚠  address already in use**  bạn quên đổi cổng. Node 2 phải dùng --port 30304, --http.port 8546, --authrpc.port 8552.

**⚠  Node 1 tắt mất**  bạn đã đóng nhầm cửa sổ. Chạy lại lệnh ở bước 7a.

**⚠  Không tìm thấy thư mục**  cửa sổ mới luôn bắt đầu ở thư mục nhà — phải cd vào private-net trước.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Nhấn: MỞ CỬA SỔ MỚI, không tắt cửa sổ node 1. Nhiều sinh viên tắt mất node 1. Thời lượng: 6 phút.</span></small>

<!-- page 27 of 58 -->

## **Kiểm chứng: mạng của bạn đang sống**

Gõ ở console của node 1, tại dấu nhắc >

**Mục 7**

Đây là console JavaScript, nên bạn gõ lệnh giống như viết JavaScript. Gõ eth.blockNumber hai lần cách nhau 10 giây để thấy nó tăng.

Gõ lệnh này

> eth.blockNumber

> eth.accounts

> web3.fromWei(

eth.getBalance(eth.accounts[0]),

"ether")

> eth.getBlock(1)

Kết quả mong đợi

42                <- so nay TANG dan

["0x9ae1b4c7fd3e08..."]

<- vi cua node 1

1000              <- so du tu alloc

{ number: 1, hash: "0x..",

parentHash: "0x5e1fc7..",

<- chinh la hash cua khoi

genesis in ra o buoc 6

timestamp: 176..., transactions: [] }

**⚠  blockNumber luôn bằng 0**  node không ký được block. Xem lại dòng WARN “unauthorized signer” ở slide đọc log.

**⚠  Số dư bằng 0**  địa chỉ trong alloc bị sai (thừa 0x hoặc chép thiếu ký tự). Sửa genesis rồi init lại.

**⚠  Gõ lệnh xong không thấy gì**  bạn đang ở terminal thường chứ không phải console của geth. Console luôn có dấu nhắc >.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Nhấn: blockNumber phải TĂNG mỗi 5 giây. Thời lượng: 6 phút.</span></small>

<!-- page 28 of 58 -->

## **Mốc kiểm tra 2: kết thúc buổi 2**

Chụp màn hình ngay tại lớp để nộp

**Hết buổi 2**

**Đến đây bạn phải có được**

Node 1 đang in “Successfully sealed new block” liên tục

eth.blockNumber trả về một số đang tăng dần

eth.accounts trả về đúng địa chỉ ví của node 1

Số dư của ví node 1 là 1000 ETH

Node 2 đang chạy ở cửa sổ khác, không báo lỗi

### **CHÚC MỪNG**

Bạn vừa dựng và vận hành một mạng blockchain hoàn chỉnh.

Nó có khối genesis do bạn tự thiết kế, tài khoản do bạn tự tạo, và đang tự sinh block mỗi 5 giây. Về nguyên lý, nó hoạt động giống hệt mạng Ethereum thật.

➡️  Buổi 3 sẽ nối hai node lại thành một mạng thật sự, gắn MetaMask và Hardhat vào, rồi gửi giao dịch đầu tiên.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đây là kết quả cuối buổi 2. Yêu cầu chụp màn hình ngay tại lớp. Thời lượng: 6 phút.</span></small>

<!-- page 29 of 58 -->

## **Slide cứu hộ: dừng và làm lại**

Bạn chắc chắn sẽ cần tới slide này khi về nhà tự làm lại

**Tham chiếu**

| Tình huống | Cách xử lý |
| --- | --- |
| Muốn dừng node | Bấm Ctrl + C trong cửa sổ terminal đang chạy node đó |
| Muốn chạy lại vào hôm sau | Chỉ cần chạy lại lệnh bước 7 — KHÔNG cần init lại, dữ liệu vẫn còn |
| Lỡ sửa genesis.json sau khi đã init | Xoá node1/geth và node2/geth rồi init lại. Ví trong keystore vẫn giữ nguyên |
| Muốn xoá sạch làm lại từ đầu | Xoá cả thư mục private-net rồi làm lại từ bước 2 (mất luôn ví, phải tạo lại) |
| Máy tắt đột ngột, node báo lỗi CSDL | Xoá node*/geth và init lại; dữ liệu chuỗi thử nghiệm mất cũng không sao |
| Muốn xem lại lệnh đã gõ | Bấm phím mũi tên lên trong terminal để cuộn lại lịch sử lệnh |

⏱️  Mẹo tiết kiệm thời gian: lưu lệnh dài ở bước 7 vào tệp start-node1.sh (hoặc .bat trên Windows) để lần sau chỉ cần chạy một lệnh.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Slide cứu hộ. In ra phát cho sinh viên nếu được. Thời lượng: 3 phút.</span></small>

<!-- page 30 of 58 -->

## **Buổi 3 cần hai công cụ mới: MetaMask và Hardhat**

Hiểu vai trò trước, cài đặt ở nhà theo hai slide tiếp theo

**Chuẩn bị**

### **🦊  Ví MetaMask**

Một tiện ích cài vào trình duyệt, đóng vai CHIẾC VÍ của người dùng thường.

Ví von: nó giống ứng dụng ngân hàng trên điện thoại — bạn nhìn thấy số dư, bấm nút chuyển tiền, xác nhận bằng mật khẩu. Còn tiền thì nằm ở ngân hàng, không nằm trong điện thoại.

### **⚒️  Hardhat**

Một bộ công cụ chạy bằng Node.js, đóng vai XƯỞNG LÀM VIỆC của lập trình viên.

Ví von: nó giống Visual Studio của lập trình blockchain — biên dịch, kiểm thử, triển khai hợp đồng bằng dòng lệnh.

|  | MetaMask | Hardhat |
| --- | --- | --- |
| Ai dùng | Người dùng cuối, không biết lập trình | Lập trình viên |
| Chạy ở đâu | Trong trình duyệt Chrome / Edge | Trong terminal, cần Node.js |
| Làm gì cho ta ở buổi 3 | Giữ khoá, ký giao dịch, hiện số dư | Gọi vào mạng bằng script để kiểm chứng |
| Điểm chung | Đều gọi vào cổng 8545 của node 1 | Đều gọi vào cổng 8545 của node 1 |

🔌  Cả hai chỉ là hai cách khác nhau để đi qua CÙNG một cánh cửa JSON-RPC mà bạn đã mở ở bước 7.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 4 phút. Chỉ giới thiệu vai trò, KHÔNG giảng sâu — buổi 3 sẽ dùng thật.<br>Nhấn dòng cuối bảng: hai công cụ khác nhau hoàn toàn nhưng cùng gõ cửa một chỗ. Đó là ý nghĩa của một giao thức chuẩn.<br>Hai slide sau là hướng dẫn cài, giao về nhà. Chiếu nhanh rồi dặn sinh viên làm theo.</span></small>

<!-- page 31 of 58 -->

## **Cài đặt MetaMask**

Làm ở nhà trước buổi 3

**Tự làm ở nhà**

Các bước thực hiện

Kết quả mong đợi

1. Mo trinh duyet Chrome hoac Edge

vao  https://metamask.io  -> Download

2. Bam "Add to Chrome" -> Add extension

3. Chon "Create a new wallet"

KHONG chon Import - ta tao vi MOI hoan toan

4. Dat mat khau cho tien ich (mat khau nay chi

mo khoa tien ich tren may nay)

5. MetaMask hien 12 tu khoa bi mat

-> chep ra GIAY, cat di

-> lam bai kiem tra xac nhan 12 tu

6. Ghim tien ich vao thanh cong cu cho de bam

Cai xong ban se thay:

\- Bieu tuong con cao o goc

phai trinh duyet

\- Ten mang o goc tren ben trai:

Ethereum Mainnet

\- Mot dia chi vi dang 0x...

\- So du: 0 ETH

So du bang 0 la DUNG.

Vi vua tao, chua ai gui tien.

Buoi 3 se chuyen tien tu

node 1 sang vi nay.

Chỉ cài từ trang chính thức metamask.io. Có rất nhiều tiện ích giả mạo trên cửa hàng tiện ích — cài nhầm là mất ví thật.

**⚠  TUYỆT ĐỐI không dùng ví cá nhân đang có tiền thật**  tạo ví mới hoàn toàn cho môn học. Mạng riêng của lớp không liên quan gì tới tiền thật.

**⚠  12 từ khoá bí mật là gì?**  là chìa khoá gốc của ví. Ai có 12 từ đó là có toàn quyền. Không chụp màn hình, không lưu vào Zalo, không gửi cho ai kể cả giảng viên.

**⚠  Máy phòng máy dùng chung**  cài trên tài khoản trình duyệt của riêng bạn, và đăng xuất khi rời máy.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">GIAO VỀ NHÀ. Tại lớp chỉ chiếu và đọc to hai ô cảnh báo đầu, khoảng 3 phút.<br>Nhấn: tạo ví MỚI, không import ví cá nhân. Đây là quy tắc an toàn số một khi học blockchain.<br>Sinh viên nào đã có MetaMask với tiền thật thì tạo thêm một tài khoản riêng trong cùng tiện ích cũng được, nhưng ví mới hoàn toàn vẫn an toàn hơn.</span></small>

<!-- page 32 of 58 -->

## **Cài đặt Node.js và Hardhat**

Làm ở nhà trước buổi 3 — Hardhat chạy trên Node.js nên phải cài Node trước

### **Tự làm ở nhà**

Terminal

\# 1. Cai Node.js ban LTS tu  https://nodejs.org

\#    roi MO LAI terminal va kiem tra:

node -v

npm -v

\# 2. Tao thu muc rieng cho Hardhat

\#    (KHONG dat trong private-net)

cd Desktop

mkdir hardhat-lab && cd hardhat-lab

npm init -y

\# 3. Cai Hardhat - NHO ghim @3

npm install --save-dev hardhat@3

\# 4. Khoi tao du an

npx hardhat --init

Kết quả mong đợi

\$ node -v

v22.x.x        <- can 22 tro len

\$ npm -v

10.x.x

\$ npx hardhat --version

3.x.x          <- PHAI la 3

Thu muc hardhat-lab co:

contracts/

test/

hardhat.config.ts

node\_modules/

Node.js là môi trường chạy JavaScript ngoài trình duyệt; npm là công cụ cài thư viện đi kèm nó. Hardhat là một thư viện npm, nên không có Node.js thì không cài được Hardhat.

**⚠  node: command not found sau khi cài**  chưa mở lại terminal. Đóng hẳn cửa sổ rồi mở cửa sổ mới.

**⚠  Task not found: init**  Hardhat 3 dùng npx hardhat --init với HAI dấu gạch.

**⚠  npx hardhat --version ra 2.x.x**  bạn quên ghim @3. Xoá node\_modules rồi cài lại: npm install --save-dev hardhat@3.

**⚠  npm install rất lâu**  bình thường, lần đầu tải khoảng 200MB. Cứ để chạy.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">GIAO VỀ NHÀ. Tại lớp chỉ chiếu khoảng 3 phút, nhấn hai chỗ: ghim @3, và hai dấu gạch ở --init.<br>Giải thích ngắn Node.js là gì cho sinh viên chưa từng dùng — đây là lần đầu môn học chạm tới nó.<br>Thư mục hardhat-lab tách riêng khỏi private-net để tránh nhầm lẫn; từ buổi 4 dự án sẽ có thư mục riêng.<br>Ai không cài kịp thì buổi 3 xem cùng bạn bên cạnh — phần Hardhat chỉ chiếm 10 phút.</span></small>

<!-- page 33 of 58 -->

## **Bài tập về nhà buổi 2**

Nộp trước buổi 3

**Bài tập**

### **1**

### **2**

### **3**

### **4**

### **5**

### **Dựng lại toàn bộ mạng một mình ở nhà**

Không xem slide, chỉ xem ghi chú của bạn. Làm được là bạn đã thực sự hiểu.

### **Chụp 3 ảnh màn hình**

① Node 1 đang in “Successfully sealed new block”  ② Kết quả eth.blockNumber  ③ Số dư 1000 ETH của ví node 1.

### **Đưa cấu hình lên GitHub của nhóm**

Tạo thư mục infra/, đưa genesis.json và README ghi lại các lệnh. TUYỆT ĐỐI không đưa password.txt và keystore.

### **Trả lời 2 câu hỏi vào README**

① Vì sao hai node phải dùng chung một genesis.json?  ② Điều gì xảy ra nếu đổi chainId của node 2 thành 99999?

### **Chuẩn bị cho buổi 3**

Giữ nguyên private-net, đừng xoá. Cài MetaMask và Hardhat theo đúng hai slide hướng dẫn phía trên. Không cài kịp thì buổi 3 sẽ không theo được phần Mục 2.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Nói rõ hạn nộp và hình thức nộp. Nhấn việc 5 — không có MetaMask thì buổi 3 không theo kịp. Thời lượng: 4 phút.</span></small>

<!-- page 34 of 58 -->

**PHẦN B:  BUỔI 3 (1 LT / 2 TH)**

## **Go Ethereum (continue)**

Nối node, kết nối công cụ, và kiểm tra tính hợp lệ của giao dịch

Add peers

Connecting to Geth network

Validating a transaction

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Bắt đầu buổi 3. Chia ba phần rõ ràng: nối node (35 phút) — kết nối MetaMask & Hardhat (45 phút) — giao dịch và tính hợp lệ (50 phút).<br>Dành 10 phút đầu cứu những sinh viên chưa chạy được mạng ở buổi 2 — phát sẵn thư mục private-net mẫu để họ theo kịp.</span></small>

<!-- page 35 of 58 -->

## **Khởi động: kiểm tra máy đã sẵn sàng chưa**

Mười phút đầu buổi dành cho việc này, đừng bỏ qua

**Đầu buổi 3**

### **Đến đây bạn phải có được**

Có private-net với genesis.json, password.txt, node1/, node2/

Có ghi chú chứa hai địa chỉ ví (node 1 và node 2)

Chạy được node 1 và thấy “Successfully sealed new block”

Đã cài tiện ích MetaMask trên Chrome hoặc Edge

### **Nếu buổi 2 chưa xong**

Lấy thư mục private-net mẫu từ giảng viên, chạy lại geth init cho cả hai node rồi khởi chạy node 1.

Bạn vẫn theo kịp buổi hôm nay — nhưng hãy làm lại bài tập buổi 2 ở nhà.

🦊  Chưa cài MetaMask hoặc Hardhat: quay lại hai slide hướng dẫn ở cuối buổi 2, làm ngay trong 10 phút đầu. Nhớ tạo ví MỚI, không dùng ví cá nhân có tiền thật.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đi một vòng lớp. Ai chưa xong buổi 2 thì phát thư mục mẫu để không bị bỏ lại. Thời lượng: 10 phút.</span></small>

<!-- page 36 of 58 -->

## **Vấn đề: hai node đang không biết nhau**

Cho sinh viên gõ eth.blockNumber ở cả hai cửa sổ để tự thấy sự khác biệt

**Mục 1**

**Node 1: đang ký block**

Cửa sổ terminal thứ nhất.

•  Liên tục in “Successfully sealed new block”

•  eth.blockNumber tăng: 120, 121, 122…

•  Nó đang tự tạo block một mình

•  Nó không biết node 2 tồn tại

**Node 2: đang cô lập**

Cửa sổ terminal thứ hai.

•  eth.blockNumber luôn trả về 0

•  Không có block nào được tạo hay nhận

•  Có cùng khối genesis nhưng chưa nghe được ai

•  Giống hai máy cùng cắm điện nhưng chưa nối mạng

**VIỆC CẦN LÀM**

Cho node 2 biết địa chỉ liên lạc của node 1. Sau khi kết nối, node 2 sẽ tự động tải toàn bộ block đã có về, rồi tiếp tục nhận các block mới ngay khi node 1 tạo ra.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Trải nghiệm trực tiếp dễ nhớ hơn giảng. Bắt cả lớp gõ eth.blockNumber ở hai cửa sổ. Thời lượng: 5 phút.</span></small>

<!-- page 37 of 58 -->

## **enode là gì?**

Ví von số điện thoại rất hiệu quả, chỉ rõ ba phần của chuỗi trên màn hình

**Mục 1**

| Trong đời thường | tương ứng | Trong blockchain |
| --- | --- | --- |
| Muốn gọi cho ai, bạn cần số điện thoại của họ | tương ứng | Muốn nối tới một node, bạn cần chuỗi enode của node đó |
| Số điện thoại là duy nhất cho mỗi người | tương ứng | Mỗi node có một enode duy nhất, sinh từ khoá của node |
| Số gồm mã vùng và số thuê bao | tương ứng | enode gồm: định danh node + địa chỉ IP + cổng |
| Bạn lưu số vào danh bạ để lần sau khỏi nhập | tương ứng | Bạn ghi enode vào static-nodes.json để tự nối lại |

Cấu trúc một chuỗi enode

enode://a4f3b2...9c2e@127.0.0.1:30303

|\_\_\_\_\_\_\_\_\_\_|  |\_\_\_\_\_\_\_| |\_\_\_|

dinh danh     dia chi   cong

cua node      IP may    P2P

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 5 phút. Chỉ tay vào ba phần trên màn hình khi giảng.</span></small>

<!-- page 38 of 58 -->

## **Bước 8: Lấy enode của node 1**

Gõ tại dấu nhắc > của CỬA SỔ NODE 1

**Mục 1**

Chép lại toàn bộ chuỗi kết quả. Bỏ phần ?discport=0 ở cuối khi dùng ở bước sau.

Gõ lệnh này

> admin.nodeInfo.enode

Kết quả mong đợi

"enode://a4f3b2c19e08d75f3a2c9b40

d5e81f7c62a09b3d4e75f81c02a9b6

d3e50f7a1c9@127.0.0.1:30303

?discport=0"

(Chuoi cua ban se KHAC hoan toan)

**⚠  admin is not defined**  bạn đang attach qua HTTP. Trong cửa sổ chạy geth ... console thì mọi namespace luôn có sẵn qua IPC — hãy gõ ở đúng cửa sổ đó.

**⚠  Chuỗi quá dài bị xuống dòng**  vẫn copy đủ, chỉ cần bỏ phần ?discport=0 ở cuối khi dùng.

**⚠  Không copy được bằng Ctrl+C**  dùng chuột bôi đen rồi bấm chuột phải, hoặc Ctrl+Shift+C.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Chỉ cho sinh viên cách copy trong terminal. Nhiều em loay hoay đúng ở chỗ này. Thời lượng: 6 phút.</span></small>

<!-- page 39 of 58 -->

## **Bước 9: Bảo node 2 kết nối tới node 1**

Gõ ở CỬA SỔ NODE 2, không phải node 1

**Mục 1**

Dán chuỗi enode vừa chép vào TRONG dấu ngoặc kép. Bỏ phần ?discport=0 ở cuối chuỗi. Quên dấu ngoặc kép là lỗi phổ biến nhất ở bước này.

Gõ lệnh này

> admin.addPeer(

"enode://a4f3b2...0f7a1c9

@127.0.0.1:30303"

)

Kết quả mong đợi

true

(Chu "true" nghia la lenh da

duoc ghi nhan. No CHUA khang

dinh la da noi thanh cong -

buoc 10 moi kiem chung dieu do)

**⚠  Trả về false hoặc báo lỗi cú pháp**  thiếu dấu ngoặc kép quanh chuỗi enode.

**⚠  Hai node nằm trên hai máy khác nhau**  đổi 127.0.0.1 thành IP thật của máy chạy node 1.

**⚠  Gõ nhầm ở cửa sổ node 1**  không sao, chỉ cần gõ lại đúng ở cửa sổ node 2.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Nhấn: dán chuỗi enode vào TRONG dấu ngoặc kép. Thời lượng: 6 phút.</span></small>

<!-- page 40 of 58 -->

## **Bước 10: Kiểm chứng đã nối được**

Vẫn ở cửa sổ node 2

**Mục 1**

Gõ lần lượt ba lệnh sau. Chờ khoảng 10 giây rồi gõ lại eth.blockNumber để thấy nó tăng và bắt kịp node 1.

Gõ lệnh này

> net.peerCount

> admin.peers.length

> eth.blockNumber

Kết quả mong đợi

1        <- da co 1 hang xom

1

137      <- go lai sau 10 giay

se thay so nay TANG

va bang voi node 1

**⚠  peerCount vẫn bằng 0**  kiểm tra hai node có cùng --networkid và cùng genesis hash không.

**⚠  Nối được nhưng blockNumber không tăng**  node 1 đã ngừng ký block — xem lại cửa sổ node 1.

**⚠  Máy Windows chặn kết nối**  cho phép geth qua Windows Defender Firewall.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Cho lớp đếm to blockNumber ở hai cửa sổ. Khoảnh khắc node 2 bắt kịp node 1 rất ấn tượng. Thời lượng: 6 phút.</span></small>

<!-- page 41 of 58 -->

## **Mẹo: nối tự động cho những lần sau**

Không bắt buộc, nhưng rất nên làm để tiết kiệm thời gian các buổi sau

**Mục 1**

Thay vì gõ addPeer mỗi lần khởi động, ghi enode của node 1 vào một tệp để node 2 tự nối. Dừng node 2 bằng Ctrl+C trước khi tạo tệp.

node2/geth/static-nodes.json

[

"enode://a4f3b2...0f7a1c9

@127.0.0.1:30303"

]

\# Sau do khoi dong lai node 2

\# nhu binh thuong

Kết quả mong đợi

Khoi dong xong, go ngay:

> net.peerCount

1     <- tu noi, khong can

addPeer nua

**⚠  Đặt tệp sai chỗ**  tệp phải nằm trong node2/geth/ chứ không phải node2/.

**⚠  Lỗi cú pháp JSON**  nội dung là một mảng — nhớ dấu ngoặc vuông và dấu ngoặc kép.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 4 phút. CÓ THỂ BỎ nếu cháy giờ — đây là slide tuỳ chọn, giao cho sinh viên làm ở nhà.<br>LƯU Ý GIẢNG VIÊN: static-nodes.json là cơ chế cũ. Hãy chạy thử trên đúng bản geth 1.13.15 của lớp trước khi lên tiết.<br>Nếu bản đó không còn đọc tệp này, thay bằng cờ --bootnodes &lt;enode&gt; khi khởi chạy node 2.</span></small>

<!-- page 42 of 58 -->

## **Mốc kiểm tra 3: đã thành một mạng**

Không đi tiếp khi chưa đạt — phần sau sẽ vô nghĩa nếu mạng chưa chạy

**Dừng lại**

**Đến đây bạn phải có được**

net.peerCount trên node 2 trả về 1

eth.blockNumber ở hai cửa sổ gần bằng nhau và cùng tăng

Node 1 vẫn đang in “Successfully sealed new block” đều đặn

**Câu hỏi thảo luận**

Bạn vừa tạo một mạng ngang hàng: hai node tự trao đổi block, không qua máy chủ trung tâm nào.

NHƯNG: mạng của bạn chỉ có MỘT signer.

①  Tắt node 1 đi, chuyện gì xảy ra với cả mạng?

②  Vậy mạng này có thật sự phi tập trung không?

🧪  Thử ngay: tắt node 1 vài chục giây rồi bật lại. Quan sát node 2 trong lúc đó — rồi trả lời hai câu hỏi bên trên.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Dừng thật. Thời lượng: 7 phút (tăng 2 phút cho phần thảo luận).<br>Đáp án mong đợi: tắt node 1 thì chuỗi ĐỨNG HẲN, node 2 không tự ký thay được. Mạng lớp phân tán về LƯU TRỮ nhưng tập trung hoàn toàn về QUYỀN GHI.<br>Đừng bỏ qua slide này: sinh viên rất dễ hiểu nhầm “blockchain riêng = phi tập trung”.<br>Nối sang buổi 4–5: relayer của cầu nối cũng là một điểm tập trung y hệt, và đó là nguyên nhân các vụ hack cầu nối lớn nhất.</span></small>

<!-- page 43 of 58 -->

## **Kết nối vào mạng geth - cổng 8545 làm gì?**

Một cánh cửa duy nhất, hai công cụ khác nhau cùng đi qua

**Mục 2**

**JSON-RPC — ngôn ngữ chung để nói chuyện với node**

Ở bước 7a bạn đã bật --http --http.port 8545. Từ lúc đó, node 1 mở một cánh cửa tại http://127.0.0.1:8545. Bất kỳ chương trình nào cũng có thể gửi câu hỏi vào đó theo chuẩn JSON-RPC: “số dư ví này bao nhiêu?”, “gửi giao dịch này giúp tôi”.

**🦊  MetaMask — phía người dùng**

Ví chạy trong trình duyệt. Giữ khoá riêng, ký giao dịch thay bạn, hiển thị số dư cho dễ nhìn.

Nó KHÔNG lưu tiền — tiền nằm trên blockchain, MetaMask chỉ giữ chìa khoá và đọc số dư từ node.

Dùng cho: thao tác thủ công, xác nhận giao dịch bằng tay.

**⚒️  Hardhat — phía lập trình viên**

Môi trường phát triển chạy trên Node.js. Cũng gọi vào đúng cổng 8545 đó, nhưng bằng script.

Dùng cho: biên dịch, kiểm thử và triển khai smart contract tự động — từ buổi 4 trở đi.

Cùng một mạng, chỉ khác cách gọi vào.

🔐  Quy tắc an toàn: ví dùng cho học tập phải là ví MỚI, không bao giờ nạp tiền thật, không dùng lại cụm 12 từ của ví cá nhân.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 7 phút. Đây là slide khái niệm quan trọng của mục 2 trong đề cương.<br>Nhấn: MetaMask không lưu tiền, nó lưu khoá — đây là hiểu nhầm phổ biến nhất của sinh viên.</span></small>

<!-- page 44 of 58 -->

## **Bước 11: Thêm mạng riêng vào MetaMask**

Làm mẫu trên máy chiếu, phóng to màn hình

**Mục 2**

**1**

**2**

**3**

**4**

**Bấm vào tên mạng ở góc trên bên trái**

Đang hiển thị “Ethereum Mainnet” hoặc tên mạng khác.

**Chọn “Add a custom network”**

Không dùng tìm mạng tự động — mạng riêng của bạn không có trong danh mục công khai.

**Điền đúng 4 ô theo bảng bên phải**

Sai một ký tự ở Chain ID là MetaMask báo lỗi và không cho lưu.

**Bấm Save rồi chọn mạng vừa tạo**

Tên mạng phải hiện ở góc trên bên trái thay cho Ethereum Mainnet.

| Ô cần điền | Giá trị | Ghi chú |
| --- | --- | --- |
| Network name | Mang rieng cua toi | Tên tuỳ ý |
| New RPC URL | http://127.0.0.1:8545 | Đúng cổng --http.port của node 1 |
| Chain ID | 12345 | Phải trùng chainId trong genesis.json |
| Currency symbol | ETH | Tuỳ ý đặt |

⚠️  Nếu MetaMask báo “Could not fetch chain ID”: node 1 đã tắt, hoặc bạn quên --http.corsdomain "\*" khi khởi chạy node 1.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đọc rõ từng thông số trong bảng. Thời lượng: 10 phút.</span></small>

<!-- page 45 of 58 -->

## **Bước 12: Tạo ví mới trong MetaMask**

Ví này sẽ nhận tiền từ node 1 ở bước tiếp theo

**Mục 2**

**1**

**2**

**3**

**4**

**Bấm biểu tượng tài khoản, Add account, Add a new account**

Đặt tên là “Vi hoc tap” cho dễ nhớ.

**Bấm vào tên tài khoản để sao chép địa chỉ ví**

Địa chỉ dạng 0x… gồm 42 ký tự. Dán tạm vào tệp ghi chú cùng chỗ với hai địa chỉ node.

**Lúc này số dư đang là 0 ETH — đúng rồi**

Ví này vừa mới sinh ra, chưa ai gửi tiền cho nó. Bước 13 sẽ chuyển tiền từ node 1 sang.

**Vì sao không lấy thẳng ví của node 1?**

Khoá node 1 nằm trong keystore đã mã hoá; muốn đưa vào MetaMask phải giải mã và dán khoá thô — một thói quen xấu và nguy hiểm. Cách chuyển tiền dưới đây an toàn hơn và giống thực tế hơn.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Giải thích vì sao không import khoá từ keystore: an toàn hơn và đơn giản hơn nhiều. Thời lượng: 6 phút.</span></small>

<!-- page 46 of 58 -->

## **Bước 13: Chuyển tiền từ node 1 sang ví MetaMask**

Giao dịch đầu tiên của cả lớp

**Mục 2**

Quay lại CỬA SỔ NODE 1. Thay &lt;DIA_CHI_METAMASK&gt; bằng địa chỉ vừa sao chép, giữ nguyên tiền tố 0x.

Gõ lệnh này

> eth.sendTransaction({

from: eth.accounts[0],

to: "&lt;DIA_CHI_METAMASK&gt;",

value: web3.toWei(50, "ether")

})

Kết quả mong đợi

"0x8c3f21a9d7b40e6f15c82ad39

0b7e4c6152f8a03d94b6e7c821

05f3a9d2b7e40c"

<- Day la ma giao dich (tx hash)

HAY CHEP LAI - buoc 16 se

dung den no

**⚠  authentication needed: password or unlock**  ví chưa mở khoá. Khởi động node 1 kèm --unlock và --password.

**⚠  invalid address**  địa chỉ dán vào thiếu 0x hoặc thiếu ký tự. Sao chép lại từ MetaMask.

**⚠  insufficient funds**  ví node 1 không có tiền — địa chỉ trong alloc của genesis bị sai.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Cho quan sát nhật ký node 1 ngay sau khi gửi: sẽ thấy block tiếp theo có txs=1. Thời lượng: 8 phút.</span></small>

<!-- page 47 of 58 -->

## **Bước 14: Nhận tiền và gửi ngược lại**

**Mục 2**

### **Xem tiền về trong MetaMask**

### **1**

### **Chờ 5–10 giây rồi mở MetaMask**

Số dư chuyển từ 0 thành 50 ETH.

### **2**

### **3**

### **Chưa thấy? Làm mới ví**

Ba chấm rồi Settings, Advanced, Clear activity tab data.

### **Nhìn cửa sổ node 1 lúc gửi**

Thấy “Submitted transaction”, rồi block sau có txs=1.

### **Gửi NGƯỢC LẠI từ MetaMask**

### **1**

### **Bấm Send, dán địa chỉ ví node 2**

Lấy từ ghi chú buổi 2, nhớ thêm 0x ở đầu.

### **2**

### **3**

### **Nhập 1 ETH rồi bấm Next**

MetaMask hiện màn hình xác nhận: số tiền, phí gas, tổng cộng.

### **Bấm Confirm**

MetaMask dùng khoá riêng để ký. Khoá không rời khỏi máy bạn.

### **Điều vừa xảy ra, tóm tắt**

Giao dịch được ký bằng khoá riêng, rồi đưa vào phòng chờ (mempool); node 1 gói nó vào block tiếp theo; số dư hai ví được cập nhật; MetaMask đọc số dư mới từ node và hiển thị. Kiểm chứng ở node 1: eth.getBalance("&lt;DIA_CHI_NODE2&gt;").

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Nếu chưa thấy tiền, bảo sinh viên chờ 5–10 giây rồi tải lại. Thời lượng: 10 phút.</span></small>

<!-- page 48 of 58 -->

## **Bước 15: Kết nối Hardhat vào geth**

Chuẩn đầu ra: “kết nối được với môi trường phát triển Hardhat”

### **Mục 2**

hardhat.config.ts  (Hardhat 3)  +  Terminal

Kết quả mong đợi

export default {

solidity: {

version: "0.8.28",

settings: { evmVersion: "paris" }

},

networks: {

geth: { type: "http",

url: "http://127.0.0.1:8545",

chainId: 12345 }

}

};

npx hardhat console --network geth

> const p = ethers.provider

> await p.getBlockNumber()

312

> await p.getNetwork()

Network { chainId: 12345n }

<- Hardhat dang doc CHINH

mang cua ban, khong phai

mang gia lap noi bo

Mở thư mục hardhat-lab bạn đã tạo ở cuối buổi 2, khai báo mạng geth trỏ vào đúng cổng 8545, rồi mở console để kiểm chứng.

**⚠  ECONNREFUSED 127.0.0.1:8545**  node 1 đã tắt. Khởi động lại node 1 rồi thử lại.

**⚠  Chưa có thư mục hardhat-lab**  quay lại slide “Cài đặt Node.js và Hardhat” ở cuối buổi 2 và làm theo bốn bước ở đó.

**⚠  chainId mismatch**  số trong hardhat.config phải trùng chainId trong genesis.json (12345).

**⚠  Thiếu type: "http"**  Hardhat 3 bắt buộc khai báo kiểu mạng. Bỏ dòng này là báo lỗi cấu hình ngay.

**⚠  Vì sao evmVersion: "paris"?**  mạng lớp dừng ở mức London/Paris, chưa có opcode PUSH0 của Shanghai. Không đặt dòng này thì buổi 5 deploy contract sẽ gặp invalid opcode.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Slide thêm vào để bám sát chuẩn đầu ra của đề cương.<br>Nhấn: cùng một cổng 8545, MetaMask và Hardhat chỉ là hai cách gọi vào khác nhau.<br>DÒNG evmVersion RẤT QUAN TRỌNG: Clique không bật được shanghaiTime, nên EVM của mạng lớp dừng ở London. Solidity từ 0.8.20 mặc định sinh PUSH0 (Shanghai) — deploy lên mạng này sẽ chết ở buổi 5 nếu quên dòng đó.<br>Thời lượng: 10 phút. Ai chưa cài Hardhat thì xem cùng bạn bên cạnh, buổi 4 sẽ cài lại từ đầu.</span></small>

<!-- page 49 of 58 -->

## **Mốc kiểm tra 4: công cụ đã cắm vào mạng**

Chụp màn hình MetaMask có số dư để nộp bài

**Dừng lại**

**Đến đây bạn phải có được**

MetaMask đang ở mạng “Mang rieng cua toi”, không phải Mainnet

Ví MetaMask có số dư khác 0

Đã gửi một giao dịch từ MetaMask, trạng thái Confirmed

Có chép lại ít nhất một mã giao dịch (tx hash)

npx hardhat console --network geth đọc được blockNumber

### **ĐIỀU BẠN VỪA CHỨNG MINH**

Mạng blockchain do chính bạn dựng lên hoạt động y như mạng thật.

Một ví tiêu chuẩn của ngành (MetaMask) và một framework tiêu chuẩn (Hardhat) cắm vào là dùng được ngay, không cần sửa gì. Đó là sức mạnh của việc tuân theo cùng một chuẩn giao thức.

➡️  Phần cuối: khi nào một giao dịch được coi là hợp lệ, và làm sao đọc được kết quả của nó.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 5 phút.</span></small>

<!-- page 50 of 58 -->

## **Bước 16: Đọc biên nhận của giao dịch**

Biên nhận (receipt) là “hoá đơn” mạng trả về sau khi thực hiện giao dịch

**Mục 3**

Ở cửa sổ node 1, dùng mã giao dịch đã chép ở bước 13. Nhớ đặt mã trong dấu ngoặc kép.

Gõ lệnh này

> eth.getTransactionReceipt(

"0x8c3f21a9..."

)

Kết quả mong đợi

{

status: "0x1",

blockNumber: 142,

from: "0x9ae1b4c7...",

to: "0x3f72ad91...",

gasUsed: 21000,

transactionHash: "0x8c3f...",

logs: []

}

**⚠  Trả về null**  mã giao dịch sai, hoặc giao dịch chưa vào block — chờ vài giây rồi gõ lại.

**⚠  SyntaxError**  quên dấu ngoặc kép quanh mã giao dịch.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Dùng chính tx hash sinh viên vừa chép. Đọc từng trường trên màn hình của họ. Thời lượng: 6 phút.</span></small>

<!-- page 51 of 58 -->

## **Từng dòng trong biên nhận nghĩa là gì?**

Đây là thứ mọi lập trình viên phải kiểm tra trong mã của mình

**Mục 3**

| Trường | Nghĩa | Cần chú ý gì |
| --- | --- | --- |
| status | Kết quả thực hiện | 0x1 = thành công · 0x0 = thất bại (vẫn mất phí) |
| blockNumber | Giao dịch nằm trong block số mấy | Có số này nghĩa là đã được ghi vào chuỗi |
| from / to | Người gửi và người nhận | to để trống = giao dịch tạo smart contract mới |
| gasUsed | Lượng công sức tính toán đã dùng | Chuyển tiền thường luôn là 21000 |
| transactionHash | Mã định danh duy nhất của giao dịch | Dùng để tra cứu lại về sau |
| logs | Các sự kiện smart contract phát ra | Rỗng vì đây chỉ là chuyển tiền. Từ buổi 5 sẽ dùng nhiều |
| contractAddress | Địa chỉ hợp đồng vừa được tạo | Chỉ xuất hiện khi triển khai smart contract |

❗  “Gửi được” KHÔNG có nghĩa là “thành công”. Luôn kiểm tra status = 0x1 trước khi coi giao dịch là xong.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Nhấn mạnh dòng status. Thời lượng: 7 phút.</span></small>

<!-- page 52 of 58 -->

## **7 điều kiện để một giao dịch hợp lệ**

Chuẩn đầu ra buổi 3: xác định được một giao dịch có tuân thủ giao thức hay không

**Mục 3**

**1 · Chữ ký đúng**

Từ chữ ký phải khôi phục ra đúng địa chỉ người gửi. Ký bằng khoá khác thì mạng từ chối ngay.

**3 · Đủ tiền trả**

Số dư ≥ số tiền gửi + (gasLimit × maxFeePerGas). Thiếu một chút cũng bị loại khỏi phòng chờ.

**5 · Không vượt trần block**

gasLimit của giao dịch không được lớn hơn gasLimit của một block (mạng ta đặt 30 triệu).

**2 · Nonce đúng thứ tự**

Nonce phải bằng đúng số giao dịch đã xác nhận của ví. Nhỏ hơn thì bị loại, lớn hơn thì treo chờ.

**4 · Đủ gas tối thiểu**

Chuyển tiền cần ít nhất 21.000 gas; kèm dữ liệu hoặc gọi hợp đồng thì cần nhiều hơn.

**6 · Đúng chainId**

Giao dịch ký cho mạng 12345 không đem sang mạng khác dùng lại được. Cơ chế chống phát lại.

**7 · Trả đủ phí sàn**

Mạng lớp bật EIP-1559 (londonBlock: 0), nên maxFeePerGas phải ≥ baseFeePerGas của block. Thiếu là bị loại.

🧪  Hai slide tiếp theo: bạn sẽ CỐ TÌNH vi phạm điều kiện 3 và điều kiện 4 để thấy mạng phản ứng thế nào.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đọc từng điều, lấy ví dụ vi phạm. Thời lượng: 8 phút.<br>Điều 7 là điều sinh viên hay gặp nhất mà không hiểu: MetaMask gửi giao dịch Type-2 (EIP-1559) vì genesis của lớp đặt londonBlock: 0. Thông báo lỗi tương ứng là “max fee per gas less than block base fee”.<br>Nhắc lại điều 3: với EIP-1559 thì công thức tính theo maxFeePerGas, không phải gasPrice.</span></small>

<!-- page 53 of 58 -->

## **Thí nghiệm 1: cố tình gửi quá số dư**

Vi phạm điều kiện 3: không đủ tiền trả

**Học qua lỗi**

Thử gửi 999999 ETH trong khi ví chỉ có khoảng 1000 ETH. Xem mạng phản ứng thế nào.

Gõ lệnh này

> eth.sendTransaction({

from: eth.accounts[0],

to: "&lt;DIA_CHI_METAMASK&gt;",

value: web3.toWei(

999999, "ether")

})

Kết quả mong đợi

Error: insufficient funds for

gas \* price + value

<- Mang TU CHOI ngay, giao dich

khong bao gio vao block,

ban KHONG mat phi nao ca

**⚠  Nếu lệnh chạy thành công**  bạn đang có nhiều tiền hơn dự tính — hãy tăng con số lên.

**⚠  Phân biệt cho kỹ**  bị từ chối ngay (không mất phí) KHÁC với vào block rồi mới thất bại (mất phí).

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Cho sinh viên chủ động tạo lỗi. Hiểu lỗi bằng cách tự gây ra lỗi là cách nhớ lâu nhất. Thời lượng: 7 phút.</span></small>

<!-- page 54 of 58 -->

## **Thí nghiệm 2: đặt gas quá thấp**

Vi phạm điều kiện 4: không đủ gas tối thiểu

**Học qua lỗi**

Thử gửi một giao dịch nhưng chỉ cho phép tiêu 1000 gas, trong khi một lần chuyển tiền luôn cần tối thiểu 21.000 gas.

Gõ lệnh này

> eth.sendTransaction({

from: eth.accounts[0],

to: "&lt;DIA_CHI_METAMASK&gt;",

value: web3.toWei(1, "ether"),

gas: 1000

})

Kết quả mong đợi

Error: intrinsic gas too low

<- 21000 gas la chi phi CO DINH

cua mot lan chuyen tien, du

ban co muon tra it hon

**⚠  Thử tiếp**  đặt gas: 21000 thì giao dịch chạy được ngay.

**⚠  Ghi nhớ**  gas là “trần bạn cho phép tiêu”, không phải “số tiền bạn trả”. Tiêu bao nhiêu trả bấy nhiêu.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Vi phạm điều kiện 4. Giải thích vì sao 21000 là con số cố định. Thời lượng: 7 phút.</span></small>

<!-- page 55 of 58 -->

## **Bảng lỗi thường gặp khi gửi giao dịch**

**Tham chiếu**

| Thông báo lỗi | Nghĩa là gì | Cách xử lý |
| --- | --- | --- |
| insufficient funds | Không đủ tiền trả cả tiền gửi lẫn phí gas | Giảm số tiền gửi hoặc nạp thêm từ ví node 1 |
| max fee per gas less than block base fee | Vi phạm điều kiện 7: phí trần thấp hơn phí sàn của block | Trong MetaMask chọn mức phí cao hơn, hoặc bỏ tham số phí để ví tự tính |
| intrinsic gas too low | Cho phép quá ít gas | Đặt gas ít nhất 21000, hoặc bỏ tham số gas để tự tính |
| nonce too low | Nonce đã dùng cho giao dịch trước rồi | MetaMask: Settings, Advanced, Clear activity tab data |
| replacement transaction underpriced | Muốn thay giao dịch cũ nhưng phí chưa cao hơn | Tăng phí gas thêm ít nhất 10% |
| authentication needed | Ví trong geth chưa được mở khoá | Khởi động node kèm --unlock và --password |
| invalid sender / invalid chain id | Ký cho mạng khác hoặc sai chainId | Kiểm tra Chain ID trong MetaMask đúng 12345 chưa |
| Giao dịch treo mãi ở Pending | Node đang ký block đã dừng | Xem cửa sổ node 1 còn chạy không, khởi động lại nếu cần |

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 4 phút. Chỉ đọc lướt, sinh viên tự tra khi cần.</span></small>

<!-- page 56 of 58 -->

## **Mốc kiểm tra 5: kết thúc buổi 3**

Đối chiếu lại với chuẩn đầu ra ở slide 2

**Hết buổi 3**

**Đến đây bạn phải có được**

net.peerCount = 1, hai node cùng số block

MetaMask ở mạng riêng, gửi được giao dịch Confirmed

Hardhat console đọc được blockNumber qua cổng 8545

Đọc được biên nhận và chỉ ra được status = 0x1

Tự tạo được ít nhất một giao dịch KHÔNG hợp lệ và giải thích được vì sao

**Bạn đã đạt cả 3 chuẩn đầu ra**

①  Thêm được node chạy ngang hàng.

②  Kết nối được Hardhat và nhúng vào trình duyệt với MetaMask.

③  Xác định được một giao dịch có hợp lệ hay không theo 7 điều kiện của giao thức.

➡Kết thúc phần hạ tầng. Từ buổi 4 bắt đầu viết chương trình chạy trên blockchain bằng Solidity.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 5 phút. Đối chiếu công khai với slide chuẩn đầu ra đầu buổi.</span></small>

<!-- page 57 of 58 -->

## **Bài tập về nhà buổi 3**

Nộp trước buổi 4 — cộng với bài buổi 2 tạo thành điểm bài tập cá nhân

**Bài tập**

### **1**

### **2**

### **3**

### **4**

### **Làm lại toàn bộ ở nhà, một mình**

Nối node, gắn MetaMask, kết nối Hardhat, gửi hai chiều. Ghi lại các bước vào README của nhóm.

### **Chụp 5 ảnh màn hình**

① net.peerCount = 1  ② MetaMask hiện mạng riêng và số dư  ③ Một giao dịch Confirmed  ④ Biên nhận có status: "0x1"  ⑤ Hardhat console đọc được blockNumber.

### **Tự tạo và giải thích 2 lỗi**

Cố tình tạo hai giao dịch không hợp lệ KHÁC với hai thí nghiệm trên lớp. Chụp lỗi và ghi rõ nó vi phạm điều kiện nào trong 7 điều kiện.

### **Chuẩn bị cho buổi 4**

Giữ nguyên private-net, đừng xoá — buổi 4 sẽ so sánh nó với mạng giả lập của Hardhat. Từ buổi 4 dự án dùng mạng Hardhat ở cổng 8547/8548, nên geth của bạn vẫn giữ được cổng 8545.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Nêu rõ hạn nộp. Nhấn việc 4: đừng xoá private-net. Thời lượng: 4 phút.</span></small>

<!-- page 58 of 58 -->

## **Tổng kết buổi 2 và buổi 3**

Hết phần hạ tầng — từ buổi 4 chuyển sang lập trình smart contract

### **Bạn đã làm được**

Cài geth, tạo ví bằng dòng lệnh, viết khối genesis, khởi tạo chuỗi, chạy hai node, nối chúng thành mạng ngang hàng, gắn MetaMask và Hardhat, gửi giao dịch hai chiều và đọc được biên nhận.

### **Khái niệm đã gặp thật**

Khối genesis, chainId, signer, gas limit, block number, keystore, wei, enode, peer, JSON-RPC, biên nhận giao dịch, và 7 điều kiện để một giao dịch được coi là hợp lệ.

### **Kỹ năng mới**

Đọc nhật ký của một phần mềm hạ tầng và tra ngược từ thông báo lỗi ra nguyên nhân.

Chủ động tạo ra lỗi để hiểu hệ thống — cách học hiệu quả nhất với lập trình blockchain.

### **Buổi 4 sẽ làm gì**

Nhập môn Solidity và khởi động dự án 1 — Cross-chain EVM Bridge.

Dự án cầu nối cần HAI chuỗi chạy song song và khởi động lại liên tục, nên buổi 4 chuyển sang mạng giả lập của Hardhat (cổng 8547/8548). Mạng geth của bạn vẫn giữ nguyên cổng 8545 để đối chiếu.

💬  Nếu về nhà bị kẹt: chụp lại TOÀN BỘ thông báo lỗi và gửi lên nhóm lớp — ảnh chụp thiếu thông tin sẽ rất khó hỗ trợ.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Dành 5 phút cuối. Nhắc sinh viên giữ nguyên thư mục private-net và làm bài tập sớm.</span></small>