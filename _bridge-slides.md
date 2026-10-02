<!-- page 1 of 72 -->

**Hardhat 3**

**OpenZeppelin v5**

**ethers v6**

**Dự án 1: Cầu nối**

**Cross-chain EVM Bridge**

Buổi 4, 5 & 6 :  9 tiết (3 LT / 6 TH)

① Cross-chain

② Workflow



③ Source chain

④ Destination + Relayer

⑤ Front-end

Học phần Blockchain  |  Buổi 4, 5 & 6 / 15

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Deck gộp ba buổi liên tiếp của cùng một dự án trong đề cương.<br>Buổi 4 kết ở Mốc kiểm tra 1. Buổi 5 kết ở Mốc kiểm tra 3. Buổi 6 kết ở Mốc kiểm tra 5.<br>Cần có trước: sinh viên đã đọc tệp bổ trợ “Nhập môn Solidity”. Nếu lớp chưa học, dành 30 phút ôn nhanh require/mapping/event trước phần 3 của buổi 4.<br>Chuẩn bị: repository khung (starter) để nhóm nào bị kẹt có thể tải về theo kịp.</span></small>

<!-- page 2 of 72 -->

## **Chuẩn đầu ra của ba buổi**

Đây là thước đo khi bảo vệ ở buổi 7

**Buổi 4**

•  Nêu được khái niệm cross-chain

•  Trình bày các bước để thực hiện xây dựng cross-chain bridge

•  Thực hiện xây dựng được đầu cầu source chain

**Buổi 5**

•  Xây dựng smart contract phát ra sự kiện khi có yêu cầu chuyển mạch ở HAI đầu cầu

•  Thực hiện xây dựng kết nối 2 đầu cầu source chain và destination chain bằng Node.js

**Buổi 6**

•  Triển khai được giao diện người dùng cho một cầu nối cross-chain bridge

•  Kết nối được back-end, front-end và blockchain để triển khai cầu nối đầy đủ thành phần

**Sản phẩm cuối ba buổi**

Bốn thành phần chạy liền mạch: hợp đồng đầu cầu nguồn khoá token và phát tín hiệu, hợp đồng đầu cầu đích đúc token bọc, dịch vụ relayer bằng Node.js nối hai đầu, và một giao diện web để người dùng chỉ cần bấm nút. Khoá 100 token ở chuỗi A, vài giây sau có 100 token bọc ở chuỗi B — hoàn toàn tự động.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đọc to phần chuẩn đầu ra. Thời lượng: 5 phút. Nhấn: buổi 7 chấm theo đúng sáu dòng này.</span></small>

<!-- page 3 of 72 -->

## **Nội dung:**

**BUỔI 4**

1. Cross-chain overview

2. Workflow of the Bridge

3. Setting up source chain

**BUỔI 5**

1.  Setting up destination chain

2. Relayer workflow

3. Setting up relayer

**BUỔI 6**

1. Front-end: connect with MetaMask

2. Front-end: connect with smart contract & Relayer

**Bốn thành phần — mỗi buổi làm một phần**

Buổi 4 làm SourceBridge (đầu cầu nguồn).  Buổi 5 làm DestinationBridge (đầu cầu đích) và relayer.  Buổi 6 làm giao diện web.  Nhóm chia việc song song được, nhưng mọi thành viên phải hiểu cả bốn phần — buổi bảo vệ có hỏi cá nhân.

🗺️  Nếu bạn lạc, hãy tự hỏi: “mình đang ở mục nào trong tám mục này?”

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 3 phút. In slide này phát cho các nhóm trưởng.</span></small>

<!-- page 4 of 72 -->

## **Bạn đã có sẵn những gì?**

Kiểm tra nhanh nền tảng và chốt phân công trước khi bắt đầu dự án

**Đến đây bạn phải có được**

Hiểu blockchain, block, giao dịch, gas (buổi 1)

Dựng và chạy được mạng blockchain riêng (buổi 2–3)

Viết được contract có mapping, require, event, payable

Đã đọc tệp bổ trợ “Nhập môn Solidity”

Có nhóm 3–4 người và một repository GitHub chung

**Phân công trong nhóm**

Người A: hợp đồng hai đầu cầu

Người B: dịch vụ relayer (Node.js)

Người C: giao diện web React

Người D: kiểm thử và tài liệu

Ba buổi tới mỗi người bám một mảng, nhưng ai cũng phải hiểu toàn bộ hệ thống.

⚠️  Ai thiếu phần Solidity thì hướng dẫn tự học bù ngay hôm nay — buổi 4 sẽ viết hợp đồng thật, không ôn lại cú pháp.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Kiểm tra nhanh nền tảng. Chốt phân công tại lớp, ghi vào README của nhóm. Thời lượng: 6 phút.</span></small>

<!-- page 5 of 72 -->

**PHẦN A: BUỔI 4 - 1 LT / 2 TH**

## **Cross-chain và đầu cầu nguồn**

Hiểu cross-chain, nắm luồng hoạt động, rồi dựng xong SourceBridge

Cross-chain overview

Workflow of the Bridge

Setting up source chain

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Bắt đầu buổi 4. Một tiết lý thuyết (mục 1 và 2, khoảng 45 phút) rồi hai tiết thực hành (mục 3).<br>Sản phẩm cuối buổi: dự án Hardhat có SourceBridge biên dịch được, chạy thử được, kèm một bài kiểm thử tự động chạy xanh.<br>Chỉ rõ: buổi này mới xong MỘT PHẦN BA cầu nối. Đừng để sinh viên tưởng làm xong cả dự án.</span></small>

<!-- page 6 of 72 -->

## **Vấn đề: mỗi blockchain là một ốc đảo**

**Mục 1**

Câu hỏi: Bạn có token trên BNB Chain nhưng ứng dụng nằm trên Ethereum. Làm sao?

| Trong đời thường | tương ứng | Trong blockchain |
| --- | --- | --- |
| Bạn có tài khoản ở ngân hàng A, muốn dùng dịch vụ chỉ có ở ngân hàng B | tương ứng | Bạn có token trên Polygon, muốn dùng ứng dụng chỉ có trên Ethereum |
| Hai ngân hàng không tự nhìn thấy sổ sách của nhau | tương ứng | Ethereum không đọc được trạng thái của Polygon và ngược lại |
| Cần một hệ thống chuyển tiền liên ngân hàng | tương ứng | Cần một cầu nối (bridge) chuyển tài sản giữa hai chuỗi |
| Hệ thống đó phải chắc chắn: tiền trừ ở A đúng bằng tiền cộng ở B | tương ứng | Cầu nối phải chắc: khoá bao nhiêu ở chuỗi nguồn thì đúc bấy nhiêu ở chuỗi đích |

⚖️  Điểm khác biệt: ngân hàng có luật pháp và toà án bảo đảm. Cầu nối chỉ có mã nguồn bảo đảm, nên viết sai là mất tiền thật.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 8 phút. Hỏi lớp trước khi giảng, để sinh viên tự nghĩ ra nhu cầu.</span></small>

<!-- page 7 of 72 -->

## **Cầu nối hoạt động theo nguyên tắc nào?**

**Mục 1**

Lock & Mint: mô hình dự án của lớp sẽ xây

**ĐIỀU QUAN TRỌNG NHẤT PHẢI HIỂU**

Không có token nào thực sự “đi qua cầu”. Token gốc bị KHOÁ lại trong hợp đồng ở chuỗi nguồn, và một token bọc (wrapped) được ĐÚC MỚI ở chuỗi đích. Tổng số token lưu hành không đổi.

**1. Khoá ở chuỗi A**

Người dùng gửi 100 token vào hợp đồng SourceBridge, hợp đồng giữ lại.

Sau đó 

**2. Phát tín hiệu**

Hợp đồng phát ra một sự kiện ghi rõ: ai gửi, gửi cho ai, bao nhiêu.

Sau đó 

**3. Relayer nghe được**

Một chương trình chạy ngoài chuỗi bắt được sự kiện đó.

Sau đó 

**4. Đúc ở chuỗi B**

Relayer gọi hợp đồng ở chuỗi B để đúc 100 token bọc cho người nhận.

↩️  Chiều ngược lại làm đối xứng: đốt token bọc ở chuỗi B, rồi mở khoá token gốc ở chuỗi A.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 8 phút. Nhấn: token không “bay” từ chuỗi này sang chuỗi kia. Nó bị khoá một chỗ và đúc mới ở chỗ kia.</span></small>

<!-- page 8 of 72 -->

## **Vì sao phải cực kỳ cẩn thận?**

**Mục 1**

Ba vụ tấn công cầu nối lớn nhất năm 2022

### **\~600 tr USD**

**Ronin Bridge (2022)**

Kẻ tấn công chiếm đủ số khoá để ký lệnh rút giả.

### **\~326 tr USD**

**Wormhole (2022)**

Lỗi kiểm tra chữ ký, đúc token mà không có tài sản bảo chứng.

### **\~190 tr USD**

**Nomad (2022)**

Một lần cập nhật sai khiến mọi thông điệp giả đều hợp lệ.

**Ba nguyên tắc bạn phải nhớ khi viết cầu nối**

①  Không tin dữ liệu người dùng gửi lên — luôn tự kiểm tra.

②  Mỗi lệnh chuyển mạch chỉ được thực hiện đúng một lần (chống phát lại).

③  Quyền đúc token phải được kiểm soát chặt và có thể tạm dừng khẩn cấp.

📊  Riêng năm 2022, các cầu nối chiếm khoảng 64% tổng thiệt hại của toàn ngành DeFi theo thống kê của Chainalysis.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Slide gây ấn tượng. Mục tiêu: sinh viên viết mã với tâm thế phòng thủ chứ không chỉ “chạy được là xong”. Thời lượng: 6 phút.</span></small>

<!-- page 9 of 72 -->

## **Ba thành phần của hệ thống**

**SourceBridge.sol**

Nằm trên chuỗi A.

Nhận token của người dùng, khoá lại, phát sự kiện.

Viết bằng Solidity — buổi 4.

**Relayer**

Chạy trên máy tính của nhóm, KHÔNG nằm trên blockchain.

Lắng nghe sự kiện ở chuỗi A, gọi hợp đồng ở chuỗi B.

Viết bằng Node.js — buổi 5.

**Mục 2**

**DestinationBridge.sol**

Nằm trên chuỗi B.

Chỉ nhận lệnh từ relayer được cấp phép, đúc token bọc cho người nhận.

Viết bằng Solidity — buổi 5.

**Thành phần thứ tư: giao diện web (buổi 6)**

Chỉ để người dùng bấm nút cho tiện, nó KHÔNG quyết định tính đúng đắn của cầu nối. Kẻ tấn công có thể bỏ qua giao diện và gọi thẳng hợp đồng, nên mọi kiểm tra quan trọng phải nằm trong smart contract.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Chỉ rõ thành phần nào làm ở buổi nào. Thời lượng: 6 phút.</span></small>

<!-- page 10 of 72 -->

## **Relayer, mắt xích quan trọng nhất**

Sinh viên hay hỏi: vì sao hợp đồng ở chuỗi B không tự đọc chuỗi A?

**Mục 2**

**1**

**2**

**3**

**4**

**Vì sao hợp đồng ở chuỗi B không tự đọc chuỗi A?**

Smart contract chỉ nhìn thấy dữ liệu trên chính chuỗi của nó. Nó không có Internet, không gọi được ra ngoài, không đọc được chuỗi khác.

**Nên phải có một chương trình trung gian**

Relayer là một chương trình Node.js chạy liên tục: một chân ở chuỗi A để nghe, một chân ở chuỗi B để gọi.

**Relayer có được tin tuyệt đối không?**

Không. Nếu relayer bị chiếm quyền, kẻ tấn công có thể đúc token khống. Vì vậy hợp đồng đích phải kiểm tra chặt và giới hạn quyền của relayer.

**Các dự án thật làm gì để an toàn hơn?**

Dùng nhiều relayer, yêu cầu m trên n chữ ký mới cho đúc. Nhóm nào muốn điểm cộng có thể làm phần mở rộng này.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Giải thích vì sao smart contract không tự làm được việc này. Thời lượng: 6 phút.</span></small>

<!-- page 11 of 72 -->

## **Workflow of the Bridge — luồng đầy đủ 7 bước**

**Mục 2**

Đây là bản đồ cho cả ba buổi tới

**1**

Người dùng cấp quyền

Ví gọi approve() của token, cho phép SourceBridge rút số token cần chuyển.

**2**

**3**

Người dùng gọi lock()

SourceBridge kéo token về giữ, tạo mã thông điệp duy nhất, phát sự kiện TokensLocked.

Relayer bắt được sự kiện

Chương trình Node.js nhận đủ thông tin: ai nhận, bao nhiêu, mã thông điệp.

**4**

Relayer chờ đủ số xác nhận

Dự án thật đợi 5–12 block phòng chuỗi bị tổ chức lại. Mạng cục bộ của lớp có finality tức thì nên ta BỎ QUA bước này. code relayer ở buổi 5 sẽ không có nó.

**5**

Relayer gọi hợp đồng đích

Gửi giao dịch mintFromSource(mã thông điệp, người nhận, số lượng).

**6**

Hợp đồng đích kiểm tra rồi đúc

Xác minh người gọi đúng là relayer, mã thông điệp chưa từng xử lý, rồi đúc token.

**7**

Giao diện cập nhật

Web hiển thị: Đang chờ rồi Đang chuyển tiếp rồi Hoàn tất.

### **Bước 1–2 chạy trên chuỗi nguồn;  bước 3–5 chạy ngoài blockchain ;  bước 6 trên chuỗi đích  ·  bước 7 trên trình duyệt**

Buổi 4 làm bước 1–2.  Buổi 5 làm bước 3–6.  Buổi 6 làm bước 7. Nếu bạn lạc, hãy tự hỏi: “mình đang ở bước mấy trong bảy bước này?”

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đi từng bước. Đây là bản đồ cho cả ba buổi tới. Thời lượng: 10 phút.</span></small>

<!-- page 12 of 72 -->

## **Chuyển từ Remix sang Hardhat**

Công cụ để làm dự án thật theo nhóm, bắt đầu phần thực hành

**Mục 3**

| Trong đời thường | tương ứng | Trong blockchain |
| --- | --- | --- |
| Remix giống soạn thảo văn bản ngay trên trình duyệt | tương ứng | Hardhat giống làm việc với dự án thật trên máy: có thư mục, có Git |
| Sửa xong không lưu lại được lịch sử | tương ứng | Mỗi thay đổi đều commit được, cả nhóm cùng làm song song |
| Muốn kiểm thử phải bấm tay từng nút | tương ứng | Viết bài kiểm thử tự động, chạy một lệnh là kiểm tra hàng chục trường hợp |
| Muốn deploy phải bấm và chép địa chỉ thủ công | tương ứng | Một lệnh triển khai lên bất kỳ mạng nào, có ghi nhớ địa chỉ |

**YÊN TÂM**

Ngôn ngữ Solidity không đổi một chữ nào. Bạn vẫn viết contract, function, mapping, require, event y như đã học trên Remix. Chỉ khác ở chỗ mã nằm trong thư mục dự án và bạn dùng lệnh thay vì bấm nút.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Trấn an: cú pháp Solidity y hệt, chỉ đổi cách làm việc. Cả nhóm cùng làm, nhưng chỉ một người push lên repository. Thời lượng: 6 phút.</span></small>

<!-- page 13 of 72 -->

## **Mạng geth và mạng Hardhat khác nhau chỗ nào?**

**Mục 3**

Hai buổi vừa rồi bạn dựng mạng geth. Dự án này dùng mạng khác và đó là chuyện bình thường

|  | geth private-net (buổi 2–3) | Hardhat node (dự án này) |
| --- | --- | --- |
| Là gì | Node Ethereum thật, chạy đúng giao thức | Mạng giả lập trong bộ nhớ, viết bằng JavaScript |
| Dựng mất bao lâu | Cả một buổi: genesis, extradata, init, peer | Một lệnh, chạy sau 2 giây |
| Dữ liệu | Lưu trên đĩa, tắt máy vẫn còn | Trong bộ nhớ, đóng cửa sổ là mất sạch |
| Chạy nhiều chuỗi | Phải cấu hình genesis riêng cho từng chuỗi | Đổi cổng và chainId là xong |
| Cổng lớp dùng | 8545 (và 8546 cho node 2) | 8547 và 8548 — không đụng nhau |
| Dùng để học gì | Hạ tầng: block, signer, peer, đồng thuận | Ứng dụng: hợp đồng, test, deploy nhanh |

🔌  Vì dự án cầu nối cần HAI chuỗi chạy song song và phải dựng lại nhiều lần mỗi buổi, ta dùng mạng Hardhat cho nhanh. Mạng geth của bạn vẫn giữ cổng 8545 — hai môi trường sống song song, không cần tắt cái nào.

💡  Kiến thức buổi 2–3 không mất đi: mọi thứ bạn gõ vào Hardhat node đều là JSON-RPC, đúng thứ geth mở ở cổng 8545.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 5 phút. Slide này trả lời câu hỏi chắc chắn có: “vậy học geth để làm gì?”<br>Trả lời thẳng: geth dạy hạ tầng, Hardhat dạy ứng dụng. Ngành thật dùng cả hai, ở hai giai đoạn khác nhau.<br>Nhấn dòng cuối bảng về cổng — đây là lý do kỹ thuật để sinh viên không tắt nhầm mạng geth.</span></small>

<!-- page 14 of 72 -->

## **Bước 1: Khởi tạo dự án Hardhat**

Thực hành 1/6

**Mục 3**

Khi được hỏi loại dự án, chọn “A TypeScript Hardhat project using Mocha and Ethers.js”. Các câu hỏi còn lại nhấn Enter để lấy mặc định.

Gõ lệnh này

mkdir cross-chain-bridge

cd cross-chain-bridge

npm init -y

npm install --save-dev hardhat

npx hardhat --init

Kết quả mong đợi

? What type of project?

> A TypeScript Hardhat project

using Mocha and Ethers.js

... Project initialized!

**⚠  npx: command not found**  chưa cài Node.js. Kiểm tra bằng node -v.

**⚠  Cài rất lâu**  bình thường, lần đầu tải khoảng 200MB thư viện.

**⚠  Chọn nhầm loại dự án**  xoá thư mục và làm lại từ đầu.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Làm cùng cả lớp. Lưu ý chọn đúng Mocha + Ethers.js để khớp với mã mẫu của giảng viên. Thời lượng: 10 phút.</span></small>

<!-- page 15 of 72 -->

## **Thư mục dự án có những gì?**

Sinh viên cần biết đặt tệp mới ở đâu

**Mục 3**

| Thư mục / tệp | Chứa gì | Bạn làm việc ở đây không? |
| --- | --- | --- |
| contracts/ | Các tệp .sol - mã nguồn smart contract | CÓ - viết hợp đồng ở đây |
| test/ | Các bài kiểm thử tự động | CÓ - viết test ở đây |
| scripts/ | Kịch bản triển khai hợp đồng lên mạng | CÓ - từ buổi 5 |
| hardhat.config.ts | Cấu hình: phiên bản Solidity, danh sách mạng | CÓ - khai báo mạng ở đây |
| artifacts/ | Kết quả biên dịch (ABI, bytecode) - máy tự sinh | KHÔNG - đừng sửa, đừng commit |
| node_modules/ | Thư viện tải về - rất nặng | KHÔNG - đã có trong .gitignore |
| package.json | Danh sách thư viện và lệnh tắt của dự án | Thỉnh thoảng |

⚠️  Kiểm tra .gitignore đã có node\_modules/ và artifacts/ chưa. Lỡ commit hai thư mục này là repository nặng hàng trăm megabyte.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Giải thích từng thư mục. Thời lượng: 5 phút.</span></small>

<!-- page 16 of 72 -->

## **Bước 2: Biên dịch và chạy thử dự án mẫu**

Thực hành 2/6 — kiểm tra môi trường trước khi viết mã riêng

**Mục 3**

Hardhat đã tạo sẵn một contract mẫu và một bài test mẫu. Chạy để chắc chắn môi trường hoạt động tốt.

Gõ lệnh này

npx hardhat build

\# bien dich - Hardhat 3 doi ten tu compile

npx hardhat test

\# chay toan bo bai kiem thu

Kết quả mong đợi

Compiled 2 Solidity files successfully

Counter

✔ Should emit the Increment event

✔ The sum of Increment events...

2 passing (1s)

**⚠  Lỗi phiên bản Node.js**  Hardhat 3 cần Node 22 trở lên, kiểm tra bằng node -v.

**⚠  Test đỏ ngay từ đầu**  xoá node\_modules và chạy lại npm install.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Chạy để chắc chắn môi trường ổn trước khi viết mã riêng. Thời lượng: 5 phút.</span></small>

<!-- page 17 of 72 -->

## **Bước 3: Cài thư viện OpenZeppelin**

Thực hành 3/6

**Mục 3**

OpenZeppelin là bộ thư viện smart contract chuẩn của ngành. Chúng ta dùng lại thay vì tự viết từ đầu.

Gõ lệnh này

npm install @openzeppelin/contracts

Kết quả mong đợi

added 1 package

Kiem tra: thu muc

node\_modules/@openzeppelin/contracts

da xuat hien

**⚠  Cài xong nhưng import báo lỗi**  khởi động lại VS Code để nó nạp lại đường dẫn.

**⚠  Đứng sai thư mục**  phải ở trong cross-chain-bridge (nơi có package.json).

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Giải thích vì sao không tự viết ERC-20: thư viện đã được kiểm toán nhiều lần. Thời lượng: 4 phút.</span></small>

<!-- page 18 of 72 -->

## **OpenZeppelin cho bạn những gì?**

**Mục 3**

Sáu thứ này sẽ dùng đi dùng lại trong cả hai dự án của học phần

**ERC20 / ERC721**

Cài đặt sẵn chuẩn token. Bạn chỉ cần kế thừa và thêm phần riêng của mình.

**ReentrancyGuard**

Chặn tấn công gọi lại hàm khi hàm chưa chạy xong — bắt buộc với hàm chuyển tiền.

**Ownable**

Quản lý chủ sở hữu: có sẵn owner(), modifier onlyOwner, chuyển quyền sở hữu.

**SafeERC20**

Gọi token an toàn kể cả với những token cũ trả về sai kiểu dữ liệu.

**Pausable**

Công tắc dừng khẩn cấp: whenNotPaused, pause(), unpause().

**Lưu ý phiên bản 5**

Ownable BẮT BUỘC truyền địa chỉ chủ sở hữu vào constructor: Ownable(diaChiChu).

📚  Nguyên tắc trong ngành: đừng bao giờ tự viết lại những gì OpenZeppelin đã có. Mã tự viết chưa được kiểm toán là nguồn lỗ hổng số một.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 5 phút. Nhấn ô cuối — đây là thứ khiến code cũ trên mạng không compile được.</span></small>

<!-- page 19 of 72 -->

## **Bước 4: Token để đem đi chuyển**

Thực hành 4/6 — contracts/MyToken.sol

**Mục 3**

Token ERC-20 dùng để thử cầu nối, đúc sẵn 1 triệu token cho người deploy. Contract rất ngắn nhờ kế thừa OpenZeppelin.

contracts/MyToken.sol

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {ERC20} from

"@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {

constructor() ERC20("Token Lop Blockchain", "TLB") {

\_mint(msg.sender, 1\_000\_000 \* 10 \*\* decimals());

}

}

Kết quả mong đợi

npx hardhat build

Compiled 3 Solidity files

successfully

**⚠  Không tìm thấy @openzeppelin**  chưa cài thư viện ở bước 3.

**⚠  Dấu gạch dưới trong 1\_000\_000**  chỉ để dễ đọc, Solidity chấp nhận.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Chỉ ra dòng kế thừa và constructor. Thời lượng: 8 phút.</span></small>

<!-- page 20 of 72 -->

## **Thiết kế SourceBridge trước khi viết mã**

Bắt sinh viên trả lời cột giữa trước khi gõ dòng mã đầu tiên

**Mục 3**

| Câu hỏi thiết kế | Trả lời | Thể hiện trong mã |
| --- | --- | --- |
| Hợp đồng cần nhớ gì? | Địa chỉ token được phép chuyển, và số thứ tự lệnh chuyển | token (immutable), nonce (uint256) |
| Người dùng làm được gì? | Khoá token để chuyển sang chuỗi khác | function lock(nguoiNhan, soLuong, chuoiDich) |
| Hợp đồng báo ra ngoài thế nào? | Phát một sự kiện chứa đủ thông tin cho relayer | event TokensLocked(...) |
| Làm sao chống chuyển hai lần? | Mỗi lệnh có một mã định danh duy nhất | messageId = keccak256(...) |
| Ai được rút token khoá ra? | Chỉ chủ sở hữu (tạm thời, sẽ nâng cấp sau) | function release() có onlyOwner |

✍️  Thói quen tốt: viết bảng này ra giấy trước khi gõ dòng mã đầu tiên. Nhóm nào bỏ qua bước này thường phải viết lại từ đầu.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đây là thói quen kỹ sư. Thời lượng: 6 phút.</span></small>

<!-- page 21 of 72 -->

## **Mã thông điệp và chống phát lại**

Slide kỹ thuật quan trọng nhất buổi 4

**Khó nhất**

| Trong đời thường | tương ứng | Trong blockchain |
| --- | --- | --- |
| Mỗi tấm vé xem phim có một số seri riêng | tương ứng | Mỗi lệnh chuyển mạch có một messageId riêng |
| Soát vé xong thì đánh dấu vé đã dùng | tương ứng | Hợp đồng đích đánh dấu messageId đã xử lý |
| Ai đưa lại đúng tấm vé đó lần hai sẽ bị từ chối | tương ứng | Gửi lại cùng messageId sẽ bị revert |
| Số seri sinh từ: rạp nào, suất nào, ghế nào | tương ứng | messageId sinh từ: chuỗi nguồn, chuỗi đích, người gửi, người nhận, số lượng, nonce |

Công thức sinh messageId

bytes32 messageId = keccak256(

abi.encode(block.chainid, destChainId,

msg.sender, to, amount, nonce)

);

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">ĐÂY LÀ SLIDE QUAN TRỌNG NHẤT BUỔI 4. Giải thích bằng ví von vé có số seri, thật chậm.<br>Hỏi lớp: “vì sao phải đưa cả chuỗi nguồn và chuỗi đích vào công thức?” Thời lượng: 10 phút.</span></small>

<!-- page 22 of 72 -->

## **Bước 5a: SourceBridge.sol phần khai báo**

Thực hành 5/6 - phần A

### **Mục 3**

contracts/SourceBridge.sol — phần 1

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {IERC20}   from "@openzeppelin/contracts/

token/ERC20/IERC20.sol";

import {SafeERC20} from "@openzeppelin/contracts/

token/ERC20/utils/SafeERC20.sol";

import {Ownable}   from "@openzeppelin/contracts/

access/Ownable.sol";

contract SourceBridge is Ownable {

using SafeERC20 for IERC20;

IERC20  public immutable token;

uint256 public nonce;

event TokensLocked(bytes32 indexed messageId,

address indexed from, address to,

uint256 amount, uint256 destChainId);

constructor(address token\_, address owner\_)

Ownable(owner\_) { token = IERC20(token\_); }

Kết quả mong đợi

immutable nghia la gi?

Gan mot lan trong constructor

roi khong doi duoc nua. Re hon

bien thuong ve gas.

using SafeERC20 for IERC20

Cho phep goi

token.safeTransferFrom(...)

\- phien ban an toan cua

transferFrom.

Ownable(owner\_)

BAT BUOC o OpenZeppelin v5.

Giải thích từng dòng import trước khi gõ. Đừng để sinh viên copy mà không hiểu.

**⚠  No arguments passed to base constructor**  quên Ownable(owner\_). Đây là thay đổi lớn nhất của OpenZeppelin v5.

**⚠  Chưa đóng ngoặc contract**  phần B ở slide sau sẽ viết tiếp trong cùng cặp ngoặc này.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Giải thích từng dòng import. Thời lượng: 10 phút.</span></small>

<!-- page 23 of 72 -->

## **Bước 5b: Hàm lock()**

Thực hành 5/6 - phần B

### **Mục 3**

contracts/SourceBridge.sol — phần 2

error InvalidAmount();

function lock(address to, uint256 amount,

uint256 destChainId) external {

// 1. CHECKS - kiem tra dau vao

if (amount == 0 || to == address(0))

revert InvalidAmount();

// 2. EFFECTS - chot so thu tu TRUOC khi goi ra ngoai

uint256 n = nonce++;

bytes32 messageId = keccak256(abi.encode(

block.chainid, destChainId,

msg.sender, to, amount, n));

// 3. INTERACTIONS - keo token ve giu

token.safeTransferFrom(msg.sender,

address(this), amount);

// 4. BAO RA NGOAI cho relayer nghe thay

emit TokensLocked(messageId, msg.sender,

to, amount, destChainId);

}

}

Kết quả mong đợi

Kiem chung:

npx hardhat build

Compiled 4 Solidity files

successfully

Nho dong ngoac nhon cua

contract truoc khi build.

Thứ tự bắt buộc: KIỂM TRA đầu vào rồi GHI trạng thái (nonce, messageId) rồi GỌI RA NGOÀI (kéo token) rồi BÁO sự kiện. Đừng đảo khối 2 và khối 3.

**⚠  Vì sao nonce++ đặt TRƯỚC safeTransferFrom?**  vì safeTransferFrom là lời gọi RA NGOÀI. Đặt sau là mở đường cho tấn công gọi lại — xem ô giải thích ở slide sau.

**⚠  Vẫn muốn chắc chắn hơn?**  kế thừa thêm ReentrancyGuard của OpenZeppelin và đặt nonReentrant lên hàm lock.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đọc chậm từng khối được đánh số 1–4. Thời lượng: 12 phút.<br>CHÚ Ý THỨ TỰ: checks rồi effects rồi interactions. Đây chính là mẫu sẽ được đặt tên ở buổi 5 khi viết mintFromSource.<br>Hỏi lớp trước: “nếu đổi chỗ khối 2 và khối 3 thì sao?” Để sinh viên nghĩ, đừng trả lời ngay — slide sau có đáp án.</span></small>

<!-- page 24 of 72 -->

## **Đọc hiểu hàm lock()**

Hỏi sinh viên trước từng ý rồi mới giải thích

**Mục 3**

### **1**

### **2**

### **3**

### **Vì sao phải approve trước khi gọi lock?**

Hợp đồng không tự lấy token của bạn được. Bạn phải cho phép trước bằng approve() — giống ký uỷ quyền cho ngân hàng trích tiền.

### **safeTransferFrom kéo token đi đâu?**

Từ ví người gọi (msg.sender) về địa chỉ của chính hợp đồng (address(this)). Token nằm đó cho tới khi có lệnh mở khoá.

### **Vì sao dùng abi.encode chứ không phải encodePacked?**

encodePacked có thể tạo ra cùng một chuỗi byte từ hai bộ dữ liệu khác nhau — kẻ tấn công lợi dụng được. abi.encode an toàn hơn.

### **4**

### **Vì sao nonce++ đặt TRƯỚC safeTransferFrom?**

safeTransferFrom là lời gọi ra hợp đồng khác. Nếu token đó có callback, người gọi có thể nhảy ngược vào lock() khi nonce chưa tăng — hai lần khoá sinh CÙNG một messageId, đầu cầu đích chỉ đúc một lần, người dùng mất token. Đây là mẫu checks-effects-interactions, buổi 5 sẽ gặp lại.

### **5**

### **Vì sao dùng error thay cho require chuỗi?**

Tiết kiệm gas và thông báo lỗi rõ ràng hơn khi gỡ rối. Đây là cách viết được khuyến nghị từ Solidity 0.8.4.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Hỏi trước, giải thích sau. Thời lượng: 8 phút.</span></small>

<!-- page 25 of 72 -->

## **Bước 6: Bài kiểm thử đầu tiên**

Thực hành 6/6 — nền móng cho yêu cầu độ phủ trên 80%

### **Mục 3**

test/SourceBridge.test.ts

import { expect } from "chai";

import { network } from "hardhat";

describe("SourceBridge", function () {

it("khoa token va phat su kien", async function () {

const { ethers } = await network.connect();

const [chuSoHuu, nguoiDung] = await ethers.getSigners();

const token  = await ethers.deployContract("MyToken");

const bridge = await ethers.deployContract("SourceBridge",

[await token.getAddress(), chuSoHuu.address]);

const soLuong = 1000n;

await token.transfer(nguoiDung.address, soLuong);

await token.connect(nguoiDung).approve(

await bridge.getAddress(), soLuong);

await expect(bridge.connect(nguoiDung)

.lock(nguoiDung.address, soLuong, 54321))

.to.emit(bridge, "TokensLocked");

expect(await token.balanceOf(await bridge

.getAddress())).to.equal(soLuong);

});

});

Kết quả mong đợi

npx hardhat test

SourceBridge

✔ khoa token va phat

su kien

1 passing (642ms)

describe gom nhom cac test

cung chu de. it la mot

tinh huong cu the.

connect(nguoiDung) = gia lap

mot vi khac goi ham.

Ba phần của mọi bài test: SẮP ĐẶT (triển khai, chia token) rồi THỰC HIỆN (gọi lock) rồi KIỂM CHỨNG (expect sự kiện và số dư).

**⚠  Vì sao viết test ngay từ buổi 4?**  vì điều kiện dự bảo vệ là độ phủ trên 80%. Viết dần từng buổi thì nhẹ; dồn tới buổi 7 thì không kịp.

**⚠  InvalidAmount khi chạy test**  kiểm tra đã transfer token cho nguoiDung và đã approve chưa.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đây là lần đầu sinh viên viết test. Giải thích cấu trúc describe/it trước khi gõ.<br>Nhấn ba phần: sắp đặt – thực hiện – kiểm chứng. Dùng lại suốt học phần. Thời lượng: 15 phút.</span></small>

<!-- page 26 of 72 -->

## **Mốc kiểm tra 1: kết thúc buổi 4**

Nhóm nào chưa xong thì ghi lại để hỗ trợ đầu buổi 5

**Hết buổi 4**

**Đến đây bạn phải có được**

npx hardhat build chạy thành công, không lỗi

Có contracts/MyToken.sol và contracts/SourceBridge.sol

npx hardhat test cho kết quả “1 passing”

Toàn bộ mã đã commit và push lên repository của nhóm

Mỗi thành viên đã có ít nhất một commit của riêng mình

**BẠN VỪA LÀM ĐƯỢC GÌ**

Một hợp đồng thật, có dùng thư viện chuẩn của ngành, có cơ chế chống phát lại, và có bài kiểm thử tự động chứng minh nó chạy đúng.

Đây chính là quy trình mà các đội phát triển chuyên nghiệp đang làm.

Cần nhớ nhất: messageId duy nhất cho mỗi lệnh chuyển — thứ giữ cho cầu nối không bị rút tiền hai lần.

➡️  Buổi 5: viết hợp đồng đầu cầu đích và dịch vụ relayer bằng Node.js để nối hai đầu cầu lại.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đi một vòng lớp. Thời lượng: 6 phút.</span></small>

<!-- page 27 of 72 -->

## **Bài tập về nhà buổi 4**

Nộp trước buổi 5

**Bài tập**

**1**

**2**

**3**

**4**

**Viết thêm 3 bài kiểm thử**

Gọi lock với amount = 0 phải revert; gọi lock khi chưa approve phải revert; nonce tăng sau mỗi lần lock.

**Viết hàm release()**

Cho phép chủ sở hữu mở khoá và trả token về cho một địa chỉ. Nhớ dùng onlyOwner và safeTransfer.

**Đọc trước về relayer**

Tìm hiểu hàm contract.on() của thư viện ethers — buổi 5 dùng để lắng nghe sự kiện.

**Cập nhật README của nhóm**

Ghi: mục tiêu dự án, sơ đồ ba thành phần, cách chạy build và test. Đây là một phần điều kiện dự bảo vệ.

⚠️  Việc 2 và 3 là chuẩn bị trực tiếp cho buổi 5.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Nói rõ hạn nộp. Thời lượng: 4 phút.</span></small>

<!-- page 28 of 72 -->

**PHẦN B:  BUỔI 5 (1 LT/2 TH)**

## **Đầu cầu đích và dịch vụ relayer**

Dựng đầu cầu đích, hiểu luồng relayer, rồi viết relayer bằng Node.js

Setting up destination chain

Relayer workflow

Setting up relayer

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Buổi khó nhất của dự án 1. Hai phần: hợp đồng đích và triển khai (75 phút), relayer (60 phút).<br>Sản phẩm cuối buổi: khoá 100 token ở chuỗi A, relayer tự bắt sự kiện và đúc 100 token bọc ở chuỗi B trong vài giây.<br>Chuẩn bị: mã nguồn hoàn chỉnh của buổi 4 để nhóm nào chưa xong có thể tải về dùng.<br>Dặn sinh viên mở sẵn 4 cửa sổ terminal — sẽ cần rất nhiều cửa sổ trong buổi này.<br>10 phút đầu: kiểm tra nhóm nào chưa build/test được ở buổi 4, phát mã mẫu ngay.</span></small>

<!-- page 29 of 72 -->

## **Token bọc (wrapped token) là gì?**

Ví von phiếu gửi xe:  token bọc chỉ có giá trị khi token gốc thật sự bị khoá

**Mục 1**

| Trong đời thường | tương ứng | Trong blockchain |
| --- | --- | --- |
| Bạn gửi xe ở bãi và nhận một phiếu gửi xe | tương ứng | Bạn khoá token gốc ở chuỗi A và nhận token bọc ở chuỗi B |
| Phiếu gửi xe không phải là chiếc xe, nhưng đổi lại được xe | tương ứng | Token bọc không phải token gốc, nhưng đổi ngược lại được |
| Bãi xe in thêm phiếu khống thì hệ thống sụp đổ | tương ứng | Đúc token bọc mà không khoá token gốc thì cầu nối mất giá trị |
| Ai giữ quyền in phiếu phải được kiểm soát chặt | tương ứng | Chỉ hợp đồng cầu nối mới được quyền đúc token bọc |

🎯  Đây là lý do phần lớn các vụ tấn công cầu nối đều nhắm vào một mục tiêu duy nhất: chiếm quyền đúc token bọc.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Ví von phiếu gửi đồ rất dễ hiểu. Thời lượng: 6 phút.</span></small>

<!-- page 30 of 72 -->

## **Bước 7: Viết token bọc**

Thực hành 1/7: contracts/WrappedToken.sol

### **Mục 1**

contracts/WrappedToken.sol

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {ERC20}   from "@openzeppelin/contracts/

token/ERC20/ERC20.sol";

import {Ownable} from "@openzeppelin/contracts/

access/Ownable.sol";

contract WrappedToken is ERC20, Ownable {

constructor(address owner\_)

ERC20("Wrapped TLB", "wTLB") Ownable(owner\_) {}

function mint(address to, uint256 amount)

external onlyOwner {

\_mint(to, amount);

}

function burn(address from, uint256 amount)

external onlyOwner {

\_burn(from, amount);

}

}

Kết quả mong đợi

npx hardhat build

Compiled successfully

Diem khac MyToken:

\- KHONG duc san cho ai

-> tong cung ban dau = 0

\- mint va burn deu onlyOwner

Chu so huu cua token nay se

la hop dong DestinationBridge,

KHONG phai vi cua ban.

(chuyen quyen o buoc 10b)

Khác với MyToken, token này KHÔNG đúc sẵn cho ai. Chỉ địa chỉ được cấp quyền (hợp đồng cầu nối) mới được đúc.

**⚠  Thiếu một trong hai từ khoá sau chữ is**  phải có cả ERC20 và Ownable: contract WrappedToken is ERC20, Ownable.

**⚠  burn dùng để làm gì?**  để dành cho chiều ngược lại — đốt token bọc ở chuỗi B rồi mở khoá token gốc ở chuỗi A.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Chỉ ra điểm khác MyToken: không đúc sẵn, chỉ bridge mới được đúc. Thời lượng: 10 phút.</span></small>

<!-- page 31 of 72 -->

## **Thiết kế DestinationBridge**

Bắt sinh viên trả lời cột giữa trước khi gõ

**Mục 1**

| Câu hỏi thiết kế | Trả lời | Thể hiện trong mã |
| --- | --- | --- |
| Ai được gọi hàm đúc token? | Chỉ những địa chỉ relayer được chủ sở hữu cấp phép | mapping relayers + modifier onlyRelayer |
| Làm sao chặn đúc hai lần? | Ghi nhớ mọi mã thông điệp đã xử lý | mapping(bytes32 => bool) processed |
| Đúc token nào, cho ai? | Token bọc, cho địa chỉ người nhận ghi trong thông điệp | wrapped.mint(to, amount) |
| Có cách nào dừng khẩn cấp không? | Chủ sở hữu tạm dừng toàn bộ hoạt động đúc | Pausable + whenNotPaused |
| Báo cho bên ngoài biết thế nào? | Phát sự kiện khi đúc xong | event TokensMinted(...) |

### **Chuẩn đầu ra buổi 5: “phát ra sự kiện ở HAI đầu cầu”**

Dòng cuối bảng chính là chỗ đáp ứng chuẩn đầu ra. SourceBridge phát TokensLocked khi có yêu cầu chuyển mạch đi; DestinationBridge phát TokensMinted khi chuyển mạch tới. Hai sự kiện này cho phép đối soát hai đầu — và buổi 6 sẽ dùng TokensMinted để báo “hoàn tất” trên giao diện.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Nguyên tắc: hợp đồng đích phải luôn giả định relayer CÓ THỂ bị chiếm quyền, nên giới hạn tối đa những gì relayer làm được.<br>Nhấn thẻ vàng — đây là chỗ đối chiếu trực tiếp với đề cương. Thời lượng: 8 phút.</span></small>

<!-- page 32 of 72 -->

## **Bước 8a: DestinationBridge phần khai báo**

Thực hành 2/7 · phần A

### **Mục 1**

contracts/DestinationBridge.sol — phần 1

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {Ownable}  from "@openzeppelin/contracts/

access/Ownable.sol";

import {Pausable} from "@openzeppelin/contracts/

utils/Pausable.sol";

import {WrappedToken} from "./WrappedToken.sol";

contract DestinationBridge is Ownable, Pausable {

WrappedToken public immutable wrapped;

mapping(address => bool) public relayers;

mapping(bytes32 => bool) public processed;

error NotRelayer();

error AlreadyProcessed(bytes32 messageId);

event TokensMinted(bytes32 indexed messageId,

address indexed to, uint256 amount);

constructor(address wrapped\_, address owner\_)

Ownable(owner\_) {

wrapped = WrappedToken(wrapped\_);

}

Kết quả mong đợi

Hai mapping quan trong:

relayers[dia\_chi]

ai duoc phep chuyen tiep

chu so huu cap phep bang

ham setRelayer

processed[messageId]

thong diep da xu ly

= so soat ve

is Ownable, Pausable

ke thua ca hai -> co san

onlyOwner va whenNotPaused

mapping processed chính là “sổ soát vé”: mỗi mã thông điệp chỉ được dùng đúng một lần.

**⚠  Import Pausable sai đường dẫn**  OpenZeppelin v5 đặt Pausable ở utils/, không phải security/ như bản v4.

**⚠  Chưa đóng ngoặc contract**  phần B ở slide sau viết tiếp trong cùng cặp ngoặc này.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Giải thích mapping relayers và mapping processed trước khi gõ. Thời lượng: 10 phút.</span></small>

<!-- page 33 of 72 -->

## **Bước 8b: Các hàm của DestinationBridge**

Thực hành 2/7 · phần B

### **Mục 1**

contracts/DestinationBridge.sol — phần 2

modifier onlyRelayer() {

if (!relayers[msg.sender]) revert NotRelayer();

\_;

}

function mintFromSource(bytes32 messageId,

address to, uint256 amount)

external onlyRelayer whenNotPaused

{

if (processed[messageId])

revert AlreadyProcessed(messageId);

processed[messageId] = true;  // GHI TRANG THAI TRUOC

wrapped.mint(to, amount);     // ROI MOI DUC TOKEN

emit TokensMinted(messageId, to, amount);

}

function setRelayer(address r, bool ok)

external onlyOwner { relayers[r] = ok; }

function pause()   external onlyOwner { \_pause(); }

function unpause() external onlyOwner { \_unpause(); }

}

Kết quả mong đợi

npx hardhat build

Compiled 5 Solidity files

successfully

Nho dong ngoac nhon cua

contract roi moi build.

Ba ham quan tri:

setRelayer - cap/thu quyen

pause     - dung khan cap

unpause   - mo lai

Đọc chậm phần mintFromSource. Thứ tự bắt buộc: kiểm tra rồi ghi trạng thái rồi đúc token.

**⚠  Đảo hai dòng processed và mint**  hàm mint có thể gọi ngược lại mintFromSource khi cờ chưa ghi — đúc được nhiều lần.

**⚠  Quên whenNotPaused**  vẫn build được nhưng mất lớp bảo vệ thứ ba, và test pause() sẽ trượt.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Chỉ rõ thứ tự: kiểm tra rồi ghi trạng thái rồi đúc. Thời lượng: 12 phút.</span></small>

<!-- page 34 of 72 -->

## **Ba lớp bảo vệ của hàm mintFromSource**

Yêu cầu sinh viên chỉ ra dòng nào tương ứng lớp nào

**Khó nhất**

**1**

**Lớp 1 · onlyRelayer — ai được gọi?**

Người lạ gọi hàm này sẽ bị revert ngay. Chỉ những địa chỉ mà chủ sở hữu đã cấp phép mới đi qua được.

**2**

**3**

**4**

**Lớp 2 · processed — đã xử lý chưa?**

Kể cả relayer hợp lệ cũng không thể gửi lại cùng một mã thông điệp lần thứ hai để đúc thêm token.

**Lớp 3 · whenNotPaused — hệ thống có đang mở không?**

Khi phát hiện bất thường, chủ sở hữu gọi pause() để dừng toàn bộ việc đúc token, hạn chế thiệt hại.

**Vì sao ghi processed TRƯỚC khi đúc?**

Nếu đúc trước, hàm mint có thể gọi ngược lại mintFromSource khi processed chưa được ghi — kẻ tấn công đúc được nhiều lần. Đây chính là mẫu checks-effects-interactions.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Câu hỏi gần như chắc chắn xuất hiện khi bảo vệ buổi 7: “chỉ ra dòng code nào chống phát lại?”<br>Bắt sinh viên khoanh tròn ba chỗ trên màn hình của chính mình. Thời lượng: 8 phút.</span></small>

<!-- page 35 of 72 -->

## **Bước 9: Dựng hai chuỗi giả lập trên máy**

Thực hành 3/7 — hai cửa sổ này phải chạy suốt buổi

### **Mục 1**

Hai chuỗi phải khác nhau CẢ CỔNG LẪN chainId. Cùng chainId là MetaMask không phân biệt được hai mạng, và giao dịch ký cho chuỗi A phát lại nguyên vẹn được trên chuỗi B.

hardhat.config.chainB.ts  +  hai Terminal

// hardhat.config.chainB.ts - cau hinh RIENG cho chuoi B

export default {

solidity: "0.8.28",

networks: { hardhat: { chainId: 31338 } }

};

\# Cua so 1 - chuoi A (nguon) - chainId 31337

npx hardhat node --port 8547

\# Cua so 2 - chuoi B (dich)  - chainId 31338

npx hardhat node --port 8548 \

--config hardhat.config.chainB.ts

Kết quả mong đợi

JSON-RPC server at

http://127.0.0.1:8547/

Account #0: 0xf39F...2266

(10000 ETH)

Private Key: 0xac09...ff80

Account #1: 0x7099...79C8

Private Key: 0x59c6...690d

Kiem chung chainId: mo

console tren tung mang roi go

> (await ethers.provider

.getNetwork()).chainId

31337n  /  31338n

**⚠  Vì sao dùng cổng 8547/8548?**  để không đụng mạng geth private-net của buổi 2–3 đang giữ cổng 8545. Hai môi trường sống song song được.

**⚠  port already in use**  còn node Hardhat cũ đang chạy. Đóng terminal Hardhat cũ — ĐỪNG tắt nhầm cửa sổ geth.

**⚠  Chép lại Private Key của Account #0 và #1**  lát nữa relayer và MetaMask đều cần dùng.

**⚠  Đóng cửa sổ là mất hết**  node Hardhat chỉ lưu trong bộ nhớ. Đóng là phải deploy lại từ đầu.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Mở hai terminal riêng và ĐỂ NGUYÊN. Nhắc sinh viên đừng đóng. Thời lượng: 8 phút.<br>HAI ĐIỂM PHẢI NHẤN:<br>① Cổng 8547/8548 chứ không phải 8545/8546 — mạng geth của buổi 2–3 vẫn đang giữ 8545.<br>② Tệp cấu hình riêng cho chuỗi B là BẮT BUỘC. Không có nó thì cả hai node đều báo chainId 31337, MetaMask sẽ từ chối khi thêm mạng thứ hai với thông báo chain ID không khớp.<br>Câu hỏi nối buổi 3: nếu hai chuỗi cùng chainId thì giao dịch ký cho chuỗi A có phát lại được trên chuỗi B không? (Có — vi phạm đúng điều kiện số 6 đã học ở buổi 3.)<br>KIỂM CHỨNG TRƯỚC TIẾT: chạy thử cờ --port và --config trên đúng bản Hardhat 3 của lớp.</span></small>

<!-- page 36 of 72 -->

## **Bước 10a: Khai báo mạng và triển khai chuỗi nguồn**

Thực hành 4/7: phần A

### **Mục 1**

hardhat.config.ts  +  scripts/deploy-source.ts

// hardhat.config.ts - them phan networks

networks: {

chainA: { type: "http", url: "http://127.0.0.1:8545" },

chainB: { type: "http", url: "http://127.0.0.1:8546" },

},

// scripts/deploy-source.ts

import { network } from "hardhat";

const { ethers } = await network.connect();

const [chu] = await ethers.getSigners();

const token  = await ethers.deployContract("MyToken");

const bridge = await ethers.deployContract("SourceBridge",

[await token.getAddress(), chu.address]);

console.log("MyToken     :", await token.getAddress());

console.log("SourceBridge:", await bridge.getAddress());

npx hardhat run scripts/deploy-source.ts \

--network chainA

Kết quả mong đợi

MyToken     : 0x5FbDB...aa3

SourceBridge: 0xe7f17...512

CHEP LAI hai dia chi nay:

\- relayer can (buoc 12)

\- giao dien can (buoi 6)

Dan vao tep ghi chu chung

cua nhom ngay lap tuc.

Khai báo hai mạng trong hardhat.config.ts, rồi viết kịch bản triển khai cho chuỗi A. Ghi lại các địa chỉ in ra.

**⚠  could not detect network**  cửa sổ npx hardhat node đã tắt. Bật lại rồi chạy lại lệnh.

**⚠  Deploy nhầm mạng**  kiểm tra cờ --network chainA. Deploy lại là ra địa chỉ mới, phải chép lại.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Cho sinh viên chép cấu hình từ repo lớp. Nhấn: ghi lại địa chỉ hợp đồng. Thời lượng: 10 phút.</span></small>

<!-- page 37 of 72 -->

## **Bước 10b: Triển khai ở chuỗi đích**

Thực hành 4/7 · phần B — bước sinh viên hay quên nhất

### **Mục 1**

scripts/deploy-dest.ts

import { network } from "hardhat";

const { ethers } = await network.connect();

const [chu] = await ethers.getSigners();

// 1. Trien khai token boc, tam thoi chu la vi cua ban

const wrapped = await ethers.deployContract("WrappedToken",

[chu.address]);

// 2. Trien khai cau noi, tro toi token boc

const bridge  = await ethers.deployContract("DestinationBridge",

[await wrapped.getAddress(), chu.address]);

// 3. QUAN TRONG: chuyen quyen so huu token boc cho cau noi

await wrapped.transferOwnership(await bridge.getAddress());

// 4. Cap phep cho vi relayer

await bridge.setRelayer("&lt;DIA_CHI_VI_RELAYER&gt;", true);

// 5. GHI DIA CHI RA TEP de relayer va frontend tu doc

fs.writeFileSync("deployed.json", JSON.stringify({

wrapped: await wrapped.getAddress(),

destBridge: await bridge.getAddress() }, null, 2));

npx hardhat run scripts/deploy-dest.ts --network chainB

Kết quả mong đợi

WrappedToken     : 0x9fE46...0e0

DestinationBridge: 0xCf7Ed...5aa

Dia chi vi relayer:

dung Account #1 trong danh

sach ma npx hardhat node

in ra o buoc 9.

Sau buoc nay ban co 4 dia chi

hop dong + 1 dia chi vi

relayer + 1 private key.

Năm việc, trong đó việc 3 và 4 là chỗ hay bị bỏ sót: chuyển quyền sở hữu token bọc, và cấp phép cho ví relayer.

**⚠  Quên transferOwnership**  khi relayer gọi mintFromSource sẽ gặp OwnableUnauthorizedAccount. Chạy lại kịch bản.

**⚠  Quên setRelayer**  relayer sẽ bị revert NotRelayer. Có thể gọi bù bằng hardhat console.

**⚠  Vì sao ghi deployed.json?**  node Hardhat sống trong bộ nhớ, tắt là mất. Mỗi buổi phải deploy lại và địa chỉ đổi hết. Ghi ra tệp thì relayer và giao diện tự đọc, không phải sửa tay ba nơi.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Điểm mấu chốt: chuyển quyền sở hữu token bọc cho bridge. Sinh viên hay quên bước này. Thời lượng: 12 phút.<br>Làm tương tự cho deploy-source.ts: ghi thêm token và sourceBridge vào cùng tệp deployed.json.<br>Đây là đầu tư đáng giá: từ buổi 6 trở đi mỗi lần dựng lại môi trường chỉ mất 2 phút thay vì 15 phút sửa địa chỉ tay.</span></small>

<!-- page 38 of 72 -->

## **Bước 11: Kiểm thử hợp đồng đích**

Thực hành 5/7 — hai test chứng minh hai lớp bảo vệ hoạt động

### **Mục 1**

test/DestinationBridge.test.ts

it("chan nguoi la va chan xu ly lap", async function () {

const { ethers } = await network.connect();

const [chu, relayer, nguoiLa, nguoiNhan] =

await ethers.getSigners();

const bridge = await ethers.deployContract(

"DestinationBridge", [wrappedAddr, chu.address]);

await bridge.setRelayer(relayer.address, true);

const id = ethers.id("thong-diep-so-1");  // mot bytes32

await expect(bridge.connect(nguoiLa)

.mintFromSource(id, nguoiNhan.address, 100n))

.to.be.revertedWithCustomError(bridge, "NotRelayer");

// Relayer goi lan 1 -> thanh cong, lan 2 -> that bai

await bridge.connect(relayer)

.mintFromSource(id, nguoiNhan.address, 100n);

await expect(bridge.connect(relayer)

.mintFromSource(id, nguoiNhan.address, 100n))

.to.be.revertedWithCustomError(bridge,

"AlreadyProcessed");

});

Kết quả mong đợi

npx hardhat test

SourceBridge

✔ khoa token va phat su kien

DestinationBridge

✔ chan nguoi la va chan

xu ly lap

2 passing

Luu y: phai trien khai

WrappedToken truoc roi chuyen

quyen so huu cho bridge thi

test moi chay duoc - xem ma

mau trong repository lop.

Rất quan trọng cho điểm kiểm thử: một test chặn người lạ, một test chặn xử lý lặp.

**⚠  OwnableUnauthorizedAccount trong test**  chưa chuyển quyền sở hữu WrappedToken cho bridge trong phần sắp đặt.

**⚠  revertedWithCustomError không nhận**  tên lỗi phải khớp chính xác tên khai báo trong contract.

**⚠  wrappedAddr lấy ở đâu?**  phải triển khai WrappedToken trong phần sắp đặt rồi lấy địa chỉ của nó — xem mã mẫu trong repo lớp.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">TUỲ CHỌN — giao về nhà nếu cháy giờ, mã mẫu đầy đủ có trong repo lớp. Thời lượng nếu giảng: 12 phút.<br>Hai test này chứng minh hai lớp bảo vệ hoạt động, rất quan trọng cho điểm kiểm thử — nhóm nào bỏ qua phải tự làm bù trước buổi 7.</span></small>

<!-- page 39 of 72 -->

## **Mốc kiểm tra 2: hai đầu cầu đã xong**

Đây là lúc nghỉ giải lao 10 phút. Phần relayer cần sự tập trung cao

**Dừng lại**

**Đến đây bạn phải có được**

Có bốn tệp: MyToken, SourceBridge, WrappedToken, DestinationBridge

npx hardhat build không lỗi

Test chứng minh người lạ bị chặn và không đúc lại được lần hai

Đã deploy lên cả chainA và chainB, ghi lại đủ 4 địa chỉ

Đã transferOwnership token bọc và setRelayer cho ví relayer

**HAI ĐẦU CẦU ĐÃ XONG**

Bạn đã có đầu cầu nguồn (khoá token, phát tín hiệu) và đầu cầu đích (nghe lệnh, đúc token).

Cả hai đều phát sự kiện — đúng chuẩn đầu ra “phát ra sự kiện khi có yêu cầu chuyển mạch ở hai đầu cầu”.

Nhưng hai đầu này chưa biết nhau. Phần còn lại của buổi là viết chương trình nối chúng lại.

➡️  Dừng thật. Phần relayer sẽ vô nghĩa nếu hợp đồng đích chưa chạy.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đi một vòng lớp trước khi cho nghỉ. Thời lượng: 6 phút.</span></small>

<!-- page 40 of 72 -->

## **Relayer làm gì và vì sao phải viết bằng Node.js?**

Thành phần duy nhất của dự án không chạy trên blockchain

**Mục 2**

**1**

**2**

**3**

**4**

**Smart contract không có Internet**

Nó chỉ nhìn thấy dữ liệu trên chính chuỗi của nó, không gọi ra ngoài, không đọc được chuỗi khác. Nên phải có một chương trình bình thường làm trung gian.

**Relayer là một chương trình chạy liên tục**

Giống một nhân viên trực điện thoại: luôn mở, nghe thấy tiếng chuông ở chuỗi A thì gọi sang chuỗi B.

**Vì sao Node.js?**

Vì thư viện ethers dành cho JavaScript rất phổ biến và bạn sẽ dùng lại chính nó ở phần giao diện web buổi 6.

**Relayer cần một ví riêng**

Vì nó phải KÝ giao dịch gửi lên chuỗi B. Ví này phải có sẵn ETH để trả phí gas — ta dùng Account #1 của hardhat node.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Nhắc lại lý do smart contract không tự làm được. Sinh viên hay quên. Thời lượng: 6 phút.</span></small>

<!-- page 41 of 72 -->

## **Ba khái niệm của thư viện ethers**

**Mục 2**

Ba dòng này là toàn bộ nền tảng để hiểu mã relayer và mã front-end

| Khái niệm | Là gì | Ví dụ |
| --- | --- | --- |
| Provider | Đường dây nối tới một node — dùng để ĐỌC dữ liệu | new JsonRpcProvider("http://127.0.0.1:8547") |
| Wallet / Signer | Ví có khoá riêng — dùng để KÝ và GỬI giao dịch | new Wallet(privateKey, provider) |
| Contract | Đại diện của một hợp đồng trên chuỗi, cần địa chỉ và ABI | new Contract(address, abi, providerHoacWallet) |

**ABI là gì?**

Bản mô tả các hàm và sự kiện của hợp đồng, dạng JSON. Nhờ nó mà JavaScript biết cách gọi hàm Solidity. Hardhat tự sinh trong thư mục artifacts.

**Contract gắn Provider**

Chỉ đọc được dữ liệu và lắng nghe sự kiện. Không gửi được giao dịch.

**Contract gắn Wallet**

Gửi được giao dịch làm thay đổi trạng thái — và tốn gas.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">TUỲ CHỌN — đã giao đọc trước ở bài tập buổi 4 việc 3. Chỉ chiếu 3 phút để nhắc, đừng giảng lại từ đầu.<br>Ba dòng này dùng lại nguyên vẹn ở buổi 6, chỉ đổi Provider.</span></small>

<!-- page 42 of 72 -->

## **Relayer trong thực tế phải chịu được gì?**

**Mục 2**

Slide này phân biệt bài làm khá và bài làm tốt — là gợi ý điểm cộng

### **1 · Chạy lại không gây hậu quả kép**

Trước khi gửi, luôn kiểm tra processed(messageId). Đây là tính chất idempotent.

### **4 · Chờ đủ số xác nhận**

Đợi 5–12 block trước khi chuyển tiếp, phòng trường hợp chuỗi bị tổ chức lại.

### **2 · Quét bù khi khởi động lại**

Lưu số block đã quét đến đâu; khi bật lại thì dùng queryFilter để lấy các sự kiện bị bỏ lỡ.

### **5 · Bảo vệ khoá riêng**

Đọc từ biến môi trường, không ghi trong mã, không commit. Ví relayer chỉ giữ đủ ETH trả phí.

### **3 · Thử lại khi mạng lỗi**

Gặp lỗi mạng thì chờ rồi thử lại với thời gian chờ tăng dần, thay vì bỏ luôn lệnh chuyển.

### **6 · Ghi nhật ký đầy đủ**

Mỗi lệnh chuyển ghi lại: thời điểm, mã thông điệp, kết quả. Không có log thì không gỡ được lỗi.

⭐  Nhóm nào làm được ít nhất mục 1 và mục 2 sẽ được cộng điểm ở phần “tính mở rộng” khi bảo vệ. Mục 2 có slide hướng dẫn riêng ở phần sau.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">TUỲ CHỌN — chuyển sang phần bài tập về nhà nếu cháy giờ. Thời lượng nếu giảng: 7 phút.<br>Slide gợi ý điểm cộng. Mục 1 đã cài sẵn trong code relayer; mục 2 là bước 14.</span></small>

<!-- page 43 of 72 -->

## **Bước 12: Tạo dự án relayer**

Thực hành 6/7 — dự án Node.js riêng nằm trong thư mục con của repo

**Mục 3**

Tạo thư mục con tên relayer, cài hai thư viện, rồi khai báo địa chỉ và khoá vào tệp .env.

Gõ lệnh này

mkdir relayer && cd relayer

npm init -y

npm install ethers dotenv

\# Tao tep .env trong thu muc relayer:

SRC\_RPC=http://127.0.0.1:8547

DST\_RPC=http://127.0.0.1:8548

SRC\_ADDR=&lt;dia_chi_SourceBridge&gt;

DST\_ADDR=&lt;dia_chi_DestinationBridge&gt;

RELAYER\_KEY=&lt;private_key_cua_Account_1&gt;

Kết quả mong đợi

Thu muc relayer/ co:

node\_modules/

package.json

.env

Them "type": "module" vao

relayer/package.json de dung

duoc cu phap import.

**⚠  Thêm relayer/.env vào .gitignore NGAY**  không bao giờ đưa khoá riêng lên GitHub. Kiểm tra bằng git status trước mỗi commit.

**⚠  Địa chỉ hợp đồng lấy ở đâu?**  từ kết quả in ra ở bước 10a và 10b.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Relayer là dự án Node.js riêng. Nhấn .gitignore. Thời lượng: 8 phút.</span></small>

<!-- page 44 of 72 -->

## **Bước 13a: Relayer phần kết nối**

Thực hành 7/7: phần A — một chân đọc ở chuỗi A, một chân ký ở chuỗi B

### **Mục 3**

relayer/index.js — phần 1

import { JsonRpcProvider, Wallet, Contract } from "ethers";

import "dotenv/config";

import fs from "fs";

// Lay ABI tu ket qua bien dich cua Hardhat

const P = "../artifacts/contracts";

const srcAbi = JSON.parse(fs.readFileSync(

\`\${P}/SourceBridge.sol/SourceBridge.json\`)).abi;

const dstAbi = JSON.parse(fs.readFileSync(

\`\${P}/DestinationBridge.sol/DestinationBridge.json\`)).abi;

// CHAN THU NHAT: doc su kien o chuoi A (chi can provider)

const srcProvider = new JsonRpcProvider(process.env.SRC\_RPC);

const source = new Contract(process.env.SRC\_ADDR,

srcAbi, srcProvider);

// CHAN THU HAI: ky va gui giao dich o chuoi B (can vi)

const dstProvider = new JsonRpcProvider(process.env.DST\_RPC);

const viRelayer   = new Wallet(process.env.RELAYER\_KEY,

dstProvider);

const dest = new Contract(process.env.DST\_ADDR,

dstAbi, viRelayer);

console.log("Relayer da san sang. Dang lang nghe...");

Kết quả mong đợi

node index.js

Relayer da san sang.

Dang lang nghe...

(dung yen cho co nguoi

goi lock o chuoi A)

Chu y su khac nhau:

source gan srcProvider

-> chi DOC duoc

dest gan viRelayer

-> KY va GUI duoc

ABI lấy thẳng từ thư mục artifacts của Hardhat — không phải viết tay, và luôn khớp với hợp đồng vừa build.

**⚠  Cannot use import outside a module**  thiếu "type": "module" trong relayer/package.json.

**⚠  Không đọc được tệp ABI**  sai đường dẫn tới artifacts. Chạy npx hardhat build rồi kiểm tra lại.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Giải thích: một chân đọc ở chuỗi A, một chân ký ở chuỗi B. Thời lượng: 12 phút.</span></small>

<!-- page 45 of 72 -->

## **Bước 13b: Relayer phần lắng nghe**

Thực hành 7/7 · phần B — trái tim của relayer

### **Mục 3**

relayer/index.js — phần 2

source.on("TokensLocked",

async (messageId, from, to, amount, destChainId) => {

console.log("Nghe thay lenh chuyen:", messageId);

console.log("   Nguoi nhan:", to,

"| So luong:", amount.toString());

try {

// Kiem tra da xu ly chua -> tranh lam viec thua

if (await dest.processed(messageId)) {

console.log("   Da xu ly truoc do, bo qua.");

return;

}

const tx = await dest.mintFromSource(messageId,

to, amount);

const rc = await tx.wait();

console.log("   Da duc token o chuoi B:", rc.hash);

} catch (e) {

console.error("   Loi khi chuyen tiep:", e.message);

}

}

);

Kết quả mong đợi

Nghe thay lenh chuyen:

0x7a3f...

Nguoi nhan: 0xf39F...

| So luong: 100

Da duc token o chuoi B:

0x2c8b...

Kiem tra processed truoc khi

gui = tinh idempotent.

Chay lai relayer hai lan cung

khong duc token hai lan.

source.on("TênSựKiện", hàmXửLý) nghĩa là: mỗi lần hợp đồng phát ra sự kiện đó, hãy chạy hàm này với các tham số của sự kiện.

**⚠  Relayer không nghe thấy gì**  kiểm tra SRC\_ADDR trong .env đúng địa chỉ SourceBridge chưa.

**⚠  amount là BigInt**  phải gọi .toString() khi in ra, không nối thẳng vào chuỗi.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đây là trái tim của relayer. Giải thích contract.on() thật kỹ. Thời lượng: 15 phút.</span></small>

<!-- page 46 of 72 -->

## **Bước 14: Quét bù khi khởi động lại**

### **Điểm cộng**

relayer/index.js — phần 3

const FILE = "./last-block.txt";

async function catchUp() {

const from = fs.existsSync(FILE)

? Number(fs.readFileSync(FILE)) + 1 : 0;

const to = await srcProvider.getBlockNumber();

const logs = await source.queryFilter("TokensLocked",

from, to);

console.log(\`Quet bu \${logs.length} su kien\`);

for (const log of logs) {

const { messageId, to: nguoiNhan, amount } = log.args;

if (await dest.processed(messageId)) continue;

try {

await (await dest.mintFromSource(messageId,

nguoiNhan, amount)).wait();

} catch (e) { console.error(messageId, e.message); }

}

fs.writeFileSync(FILE, String(to));

}

await catchUp();   // GOI TRUOC source.on(...)

Kết quả mong đợi

Thu nghiem:

1. Tat relayer (Ctrl+C)

2. Goi lock them 2 lan o

chuoi A

3. Bat lai relayer

Quet bu 2 su kien

Da duc token o chuoi B

Da duc token o chuoi B

Relayer da san sang.

Dang lang nghe...

(khong su kien nao bi mat)

contract.on chỉ nghe được sự kiện MỚI. Relayer tắt 10 phút thì mọi sự kiện trong 10 phút đó mất luôn. Gọi catchUp TRƯỚC khi đăng ký lắng nghe.

**⚠  Gọi catchUp SAU source.on**  sẽ có khoảng trống giữa hai cơ chế. Phải gọi trước.

**⚠  Nhớ cập nhật last-block.txt trong cả nhánh source.on**  chỉ ghi trong catchUp thì mỗi lần khởi động lại sẽ quét lại từ mốc cũ, khoảng quét phình dần và chạy càng ngày càng chậm.

**⚠  Quét bù xử lý trùng**  không sao — processed[messageId] trong hợp đồng chặn lại, chỉ tốn chút gas.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Slide bổ sung so với giáo trình gốc, để nhóm làm được mục 2 trong danh sách điểm cộng.<br>Cho cả lớp tắt relayer và thử. Nhóm nào làm được phần này chắc chắn ăn điểm ở buổi 7. Thời lượng: 12 phút.</span></small>

<!-- page 47 of 72 -->

## **Bước 15: Chạy thử toàn tuyến cầu nối**

Khoảnh khắc quan trọng nhất của dự án 1

**Mục 3**

Mở cửa sổ thứ ba chạy relayer, cửa sổ thứ tư gọi lock() ở chuỗi A. Quan sát cửa sổ relayer.

Gõ lệnh này

\# Cua so 3

cd relayer && node index.js

\# Cua so 4 - goi lock

npx hardhat run scripts/do-lock.ts \

--network chainA

Kết quả mong đợi

Cua so 3 se hien:

Relayer da san sang.

Dang lang nghe...

Nghe thay lenh chuyen: 0x7a3f...

Nguoi nhan: 0xf39F...

| So luong: 100

Da duc token o chuoi B.

Ma giao dich: 0x2c8b...

**⚠  Relayer không nghe thấy gì**  kiểm tra SRC\_ADDR trong .env đúng địa chỉ SourceBridge chưa.

**⚠  NotRelayer**  ví relayer chưa được cấp phép, chạy lại setRelayer ở bước 10b.

**⚠  OwnableUnauthorizedAccount**  quên chuyển quyền sở hữu token bọc cho bridge.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Chuẩn bị sẵn script do-lock.ts để tiết kiệm thời gian. Yêu cầu chụp màn hình cửa sổ relayer để nộp. Thời lượng: 12 phút.</span></small>

<!-- page 48 of 72 -->

## **Lỗi thường gặp khi chạy relayer**

**Tham chiếu**

| Hiện tượng | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| Relayer chạy nhưng không in gì | Sai địa chỉ hợp đồng nguồn trong .env | So lại SRC_ADDR với địa chỉ in ra lúc deploy |
| Cannot find module "ethers" | Chưa cài thư viện hoặc đứng sai thư mục | cd relayer rồi npm install ethers dotenv |
| Cannot use import outside a module | Thiếu khai báo kiểu module | Thêm "type": "module" vào relayer/package.json |
| revert NotRelayer | Ví relayer chưa được cấp phép ở chuỗi B | Gọi setRelayer(diaChiRelayer, true) |
| OwnableUnauthorizedAccount | Token bọc chưa thuộc quyền sở hữu của bridge | Gọi wrapped.transferOwnership(diaChiBridge) |
| Không đọc được tệp ABI | Sai đường dẫn tới thư mục artifacts | Chạy npx hardhat build rồi kiểm tra lại đường dẫn |
| Mất hết dữ liệu sau khi tắt máy | Node Hardhat chỉ lưu trong bộ nhớ | Bình thường. Chạy lại node rồi deploy lại từ đầu |

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">TUỲ CHỌN — nên IN GIẤY phát cho nhóm thay vì chiếu. Nếu đã phát giấy thì bỏ hẳn khi trình chiếu.</span></small>

<!-- page 49 of 72 -->

## **Mốc kiểm tra 3: kết thúc buổi 5**

Yêu cầu chụp màn hình cửa sổ relayer để nộp bài

**Hết buổi 5**

**Đến đây bạn phải có được**

Bốn cửa sổ đang chạy: node A, node B, relayer, cửa sổ gọi lệnh

Gọi lock() ở chuỗi A thì relayer in “Da duc token o chuoi B”

BẤT BIẾN: wrapped.totalSupply() == token.balanceOf(SourceBridge)

Khoá thêm 50 nữa — bất biến trên vẫn đúng

Người lạ gọi mintFromSource bị revert NotRelayer

**BẤT BIẾN CỦA MỌI CẦU NỐI LOCK & MINT**

Số token bọc đang lưu hành phải LUÔN bằng số token gốc đang bị khoá:

wrapped.totalSupply()  ==  token.balanceOf(SourceBridge)

Đây chính là “bãi xe không được in phiếu khống” ở slide đầu buổi. Lệch một đồng nghĩa là cầu nối đã hỏng. Mọi cầu nối thật đều có hệ thống giám sát chạy liên tục để canh đúng đẳng thức này.

➡  Buổi 6: bọc toàn bộ quy trình này bằng giao diện web React kết nối MetaMask.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đây là nghiệm thu phần back-end. Thời lượng: 6 phút.</span></small>

<!-- page 50 of 72 -->

## **Bài tập về nhà buổi 5**

Nộp trước buổi 6

**Bài tập**

### **1**

### **2**

### **3**

### **4**

### **Chạy lại toàn tuyến ở nhà và ghi lại quy trình**

Viết vào README: cần mở mấy cửa sổ, chạy lệnh gì theo thứ tự nào. Buổi 6 sẽ cần chạy lại toàn bộ.

### **Hoàn thiện cơ chế quét bù và ghi nhật ký**

Bảo đảm chạy relayer hai lần cùng lúc cũng không đúc token hai lần. Ghi log ra tệp để gỡ lỗi.

### **Viết thêm test cho DestinationBridge**

① pause() rồi gọi mintFromSource phải revert  ② người không phải chủ gọi setRelayer phải revert  ③ TEST BẤT BIẾN: sau hai lần khoá, wrapped.totalSupply() phải bằng token.balanceOf(SourceBridge).

### **Chuẩn bị buổi 6**

Cài sẵn dự án React: npm create vite@latest frontend -- --template react-ts, rồi npm install ethers.

⚠️  Việc 1 là bắt buộc để buổi 6 làm được giao diện — không chạy lại được toàn tuyến thì không có gì để bọc.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 4 phút.</span></small>

<!-- page 51 of 72 -->

**PHẦN C:  BUỔI 6 (1 LT/2 TH)**

## **Giao diện web cho cầu nối**

Kết nối MetaMask, rồi kết nối tới hợp đồng và relayer

Front-end: connect with MetaMask

Front-end: connect with smart contract & Relayer

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Buổi cuối của dự án 1. Chia: kiến trúc + MetaMask (65 phút), gọi hợp đồng và theo dõi (55 phút), chuẩn bị bảo vệ (15 phút).<br>Sản phẩm cuối buổi: người dùng bấm một nút trên web, token sang chuỗi B, web báo hoàn tất.<br>10 phút đầu: kiểm tra nhóm nào chưa chạy được toàn tuyến ở buổi 5, phát mã mẫu ngay.<br>Buổi này cần 5 cửa sổ — nhắc sinh viên sắp xếp màn hình từ đầu.</span></small>

<!-- page 52 of 72 -->

## **Giao diện web nằm ở đâu trong hệ thống?**

Nó là lớp vỏ tiện dụng, không phải nơi quyết định tính đúng đắn

**Mục 1**

**1**

**2**

**3**

**4**

**Trang web chạy trên máy người dùng**

Nó là mã JavaScript chạy trong trình duyệt. Không có máy chủ nào của bạn xử lý giao dịch cả.

**Nó KHÔNG giữ khoá riêng**

Mọi việc ký giao dịch đều do MetaMask làm. Trang web chỉ yêu cầu, người dùng bấm xác nhận thì MetaMask mới ký.

**Nó đọc dữ liệu trực tiếp từ node**

Không cần cơ sở dữ liệu riêng. Số dư, danh sách giao dịch đều lấy từ blockchain.

**Nó KHÔNG quyết định tính đúng đắn**

Kẻ tấn công có thể bỏ qua giao diện và gọi thẳng hợp đồng. Vì vậy MỌI kiểm tra quan trọng phải nằm trong smart contract, không phải trong JavaScript.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Nhấn: web KHÔNG giữ khoá, KHÔNG quyết định tính đúng đắn. Thời lượng: 7 phút.</span></small>

<!-- page 53 of 72 -->

## **Nhắc lại ba khái niệm của ethers**

Cùng thư viện, chỉ đổi nguồn kết nối và nguồn chữ ký

**Mục 1**

| Trong relayer (Node.js) | Trong trình duyệt (React) | Khác nhau ở đâu |
| --- | --- | --- |
| new JsonRpcProvider(url) | new BrowserProvider(window.ethereum) | Trình duyệt nói chuyện qua MetaMask, không nối thẳng tới node |
| new Wallet(privateKey, provider) | await provider.getSigner() | Trình duyệt KHÔNG có khoá riêng — người dùng giữ khoá trong MetaMask |
| new Contract(addr, abi, wallet) | new Contract(addr, abi, signer) | Giống nhau, chỉ đổi nguồn chữ ký |

**ĐIỀU KHÁC BIỆT QUAN TRỌNG NHẤT**

Relayer tự ký được vì nó giữ khoá riêng trong tệp .env. Trang web không giữ khoá nào cả — mỗi lần cần ký, nó phải hỏi MetaMask và người dùng phải bấm nút xác nhận.

🦊  Đây cũng là lý do giao diện phải hiện trạng thái rõ ràng: người dùng cần biết khi nào MetaMask sắp bật lên.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Giống buổi 5 nhưng khác ở chỗ: trên trình duyệt dùng BrowserProvider chứ không phải JsonRpcProvider. Thời lượng: 6 phút.</span></small>

<!-- page 54 of 72 -->

## **Bước 16: Tạo dự án React và cài thư viện**

Thực hành 1/8 — cửa sổ này phải chạy suốt buổi

**Mục 1**

Chạy trong thư mục dự án cross-chain-bridge, tạo thư mục frontend/ song song với contracts/ và relayer/.

Gõ lệnh này

npm create vite@latest frontend -- \

--template react-ts

cd frontend

npm install

npm install ethers

npm run dev

Kết quả mong đợi

VITE ready in 320 ms

Local: http://localhost:5173/

(Mo dia chi nay tren trinh duyet,

thay trang mau cua Vite)

**⚠  Cổng 5173 bận**  Vite tự đổi sang 5174, xem dòng thông báo trên terminal.

**⚠  Trang trắng**  mở Console của trình duyệt (F12) để xem lỗi.

**⚠  npm create hỏi lại tên dự án**  bạn quên hai dấu gạch trước --template.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Cả lớp cùng làm. Ai đã tạo ở nhà thì chỉ cần npm install. Thời lượng: 8 phút.</span></small>

<!-- page 55 of 72 -->

## **Bước 17a: Chuẩn bị ABI và địa chỉ hợp đồng**

Thực hành 2/8 · phần A — bước sinh viên hay bỏ sót

**Mục 1**

Trang web cần biết hai thứ: hợp đồng nằm ở địa chỉ nào, và hợp đồng có những hàm gì (ABI). Chép ABI từ artifacts của Hardhat sang React.

Gõ lệnh này

mkdir frontend/src/abi

\# Chay tu thu muc goc du an

cp artifacts/contracts/MyToken.sol/\

MyToken.json frontend/src/abi/

cp artifacts/contracts/SourceBridge.sol/\

SourceBridge.json frontend/src/abi/

cp artifacts/contracts/DestinationBridge.sol/\

DestinationBridge.json frontend/src/abi/

Kết quả mong đợi

Thu muc frontend/src/abi/

co 3 tep .json

MyToken.json

SourceBridge.json

DestinationBridge.json

**⚠  Windows không có lệnh cp**  dùng copy thay cho cp, hoặc kéo thả bằng chuột.

**⚠  Mỗi lần sửa hợp đồng phải làm gì?**  build lại rồi CHÉP LẠI ABI mới — nếu không sẽ gặp lỗi could not decode result data.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Bước này sinh viên hay bỏ sót rồi thắc mắc vì sao gọi hàm không được. Thời lượng: 7 phút.</span></small>

<!-- page 56 of 72 -->

## **Bước 17b: Tệp cấu hình chung**

Thực hành 2/8: phần B — viết địa chỉ ở MỘT chỗ duy nhất

### **Mục 1**

frontend/src/config.ts

import tokenJson from "./abi/MyToken.json";

import srcJson   from "./abi/SourceBridge.json";

import dstJson   from "./abi/DestinationBridge.json";

export const CHAIN\_A = {

chainId: 31337,               // hardhat node mac dinh

chainIdHex: "0x7a69",         // 31337 viet o he 16

rpc: "http://127.0.0.1:8547",

token:  "0x&lt;dia_chi_MyToken&gt;",

bridge: "0x&lt;dia_chi_SourceBridge&gt;",

};

export const CHAIN\_B = {

chainId: 31338,

chainIdHex: "0x7a6a",

rpc: "http://127.0.0.1:8548",

bridge: "0x&lt;dia_chi_DestinationBridge&gt;",

};

export const TOKEN\_ABI = tokenJson.abi;

export const SRC\_ABI   = srcJson.abi;

export const DST\_ABI   = dstJson.abi;

Kết quả mong đợi

chainIdHex de lam gi?

MetaMask yeu cau chainId o

dang hex. Dua so thap phan

vao se bao loi.

31337 -> 0x7a69

31338 -> 0x7a6a

Moi lan deploy lai, dia chi

hop dong doi -> sua tep nay.

Đừng rải địa chỉ hợp đồng khắp các component. Mỗi lần deploy lại chỉ phải sửa một tệp.

**⚠  TypeScript báo lỗi khi import .json**  thêm resolveJsonModule: true vào tsconfig.json.

**⚠  Sửa hợp đồng xong giao diện lỗi**  địa chỉ đã đổi sau khi deploy lại — cập nhật config.ts.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Nhấn: viết địa chỉ ở MỘT chỗ duy nhất. Thời lượng: 8 phút.</span></small>

<!-- page 57 of 72 -->

## **Bước 18: Nút kết nối ví**

Thực hành 3/8 — đoạn mã Web3 đầu tiên

### **Mục 1**

frontend/src/App.tsx

Kết quả mong đợi

import { useState } from "react";

import { BrowserProvider } from "ethers";

export default function App() {

const [diaChi, setDiaChi] = useState&lt;string | null&gt;(null);

async function ketNoiVi() {

const eth = (window as any).ethereum;

if (!eth) return alert("Ban chua cai MetaMask");

const provider = new BrowserProvider(eth);

await provider.send("eth\_requestAccounts", []);

const signer = await provider.getSigner();

setDiaChi(await signer.getAddress());

}

return diaChi

? &lt;p&gt;Da ket noi: {diaChi}&lt;/p&gt;

: &lt;button onClick={ketNoiVi}&gt;Ket noi vi&lt;/button&gt;;

}

Bam nut -> MetaMask hien:

"localhost:5173 muon

ket noi"

[ Huy ]  [ Ket noi ]

Sau khi dong y:

Da ket noi: 0xf39Fd6e5...

getSigner() tra ve doi tuong

dai dien vi dang chon trong

MetaMask. No KHONG chua

khoa rieng.

Khong tu dong ket noi khi mo

trang: do la hanh vi xam pham

quyen rieng tu.

window.ethereum là đối tượng MetaMask chèn vào mọi trang web. eth\_requestAccounts hiện cửa sổ xin quyền — người dùng có quyền từ chối.

**⚠  window.ethereum là undefined**  chưa cài MetaMask, hoặc mở trang bằng file:// thay vì http://localhost.

**⚠  getSigner báo lỗi**  ethers v6 trả về Promise — phải có await. Bản v5 thì không cần, code cũ trên mạng sẽ sai.

**⚠  Bấm nút không hiện gì**  MetaMask đang khoá. Mở tiện ích và nhập mật khẩu trước.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Giải thích từng dòng rồi cho gõ.<br>Hỏi lớp: “vì sao không tự động kết nối khi mở trang?” — dẫn tới quyền riêng tư. Thời lượng: 15 phút.</span></small>

<!-- page 58 of 72 -->

## **Bước 19a: Thêm mạng cục bộ vào MetaMask**

Thực hành 4/8:· phần A — làm bằng tay trước để hiểu

**Mục 1**

Thao tác trong MetaMask

1. MetaMask -> Add a custom network

Network name     : Chuoi A (local)

New RPC URL      : http://127.0.0.1:8547

Chain ID         : 31337

Currency symbol  : ETH

2. Lam lai cho Chuoi B (local)

RPC 8548  ·  Chain ID 31338

3. Add account -> Import account

Dan Private Key cua Account #0

(npx hardhat node in ra o buoc 9)

Kết quả mong đợi

Kiem chung:

MetaMask hien 10000 ETH

Neu thay so du nay nghia la

da ket noi dung vao node

cuc bo.

Vi Account #0 cung la vi da

duoc duc san 1 trieu TLB o

buoc deploy.

Cách làm giống buổi 3, nhưng thông số khác. Sau đó import Account #0 để có sẵn token thử.

**⚠  Could not fetch chain ID**  cửa sổ npx hardhat node đã tắt. Bật lại rồi thêm mạng lần nữa.

**⚠  Đây là ví thử nghiệm công khai**  khoá riêng của Hardhat ai cũng biết. TUYỆT ĐỐI không dùng trên mạng thật.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Làm mẫu trên máy chiếu. Nhắc import Account #0 để có sẵn token. Thời lượng: 10 phút.</span></small>

<!-- page 59 of 72 -->

## **Bước 19b: Tự đề nghị chuyển mạng**

### **Điểm cộng**

frontend/src/network.ts

import { CHAIN\_A } from "./config";

const THONG\_SO\_A = {

chainId: CHAIN\_A.chainIdHex,

chainName: "Chuoi A (local)",

rpcUrls: [CHAIN\_A.rpc],

nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }

};

export async function chuyenSangChuoiA() {

const eth = (window as any).ethereum;

try {

await eth.request({ method: "wallet\_switchEthereumChain",

params: [{ chainId: CHAIN\_A.chainIdHex }] });

} catch (e: any) {

if (e.code === 4902)        // mang chua co trong vi

await eth.request({ method: "wallet\_addEthereumChain",

params: [THONG\_SO\_A] });

}

}

Kết quả mong đợi

Trai nghiem nguoi dung:

Vi dang o Ethereum Mainnet

-> giao dien hien nut

"Chuyen sang Chuoi A"

-> bam mot cai la xong

Thay vi bat nguoi dung tu vao

Settings dien 4 o.

Thay vì bắt người dùng tự thêm mạng, ứng dụng đề nghị giúp. Mã lỗi 4902 nghĩa là mạng chưa có trong ví.

**⚠  Unrecognized chain ID**  truyền số thập phân. Phải là chuỗi hex có tiền tố 0x — dùng CHAIN\_A.chainIdHex.

**⚠  Người dùng bấm Huỷ**  bắt lỗi và hiện thông báo, đừng để trang treo im lặng.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Slide bổ sung so với giáo trình gốc, để nhóm làm được mục “tự đề nghị chuyển mạng” trong tiêu chí chấm.<br>Không bắt buộc — nhóm nào chậm thì bỏ qua, làm sau ở nhà. Thời lượng: 8 phút.</span></small>

<!-- page 60 of 72 -->

## **Bước 20: Hiển thị số dư token**

Thực hành 5/8 — lần đầu đọc dữ liệu từ hợp đồng

### **Mục 1**

frontend/src/App.tsx — phần số dư

import { Contract, formatUnits } from "ethers";

import { CHAIN\_A, TOKEN\_ABI } from "./config";

const [soDu, setSoDu] = useState("0");

async function docSoDu(signer: any, diaChi: string) {

// Contract gan signer -> vua doc vua ghi duoc

const token = new Contract(CHAIN\_A.token,

TOKEN\_ABI, signer);

const raw = await token.balanceOf(diaChi);  // wei

setSoDu(formatUnits(raw, 18));              // de doc

}

// Trong giao dien

&lt;p&gt;So du cua ban: {soDu} TLB&lt;/p&gt;

Kết quả mong đợi

So du cua ban: 1000000.0 TLB

Vi sao phai formatUnits?

100 token luu tren chuoi la

100000000000000000000

formatUnits doi ve "100.0"

Chieu nguoc lai la parseUnits

Nguoi dung nhap "100" thi

phai doi sang so lon truoc

khi gui len hop dong:

parseUnits("100", 18)

Token lưu số nguyên rất lớn: 100 token = 100000000000000000000. formatUnits đổi về dạng người đọc được.

**⚠  Số dư hiện ra 18 chữ số**  quên formatUnits.

**⚠  could not decode result data**  ABI trong src/abi cũ — chép lại từ artifacts.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Nhấn cặp formatUnits / parseUnits — dùng suốt phần còn lại. Thời lượng: 10 phút.</span></small>

<!-- page 61 of 72 -->

## **Mốc kiểm tra 4: giao diện đã thấy ví**

**Dừng lại**

**Đến đây bạn phải có được**

Bấm nút Ket noi vi thì MetaMask hiện lên xin quyền

Sau khi đồng ý, trang web hiển thị địa chỉ ví

Trang web hiển thị đúng số dư token của ví đó

**Nếu số dư hiện 0**

Ba nguyên nhân thường gặp, kiểm tra theo đúng thứ tự này:

①  MetaMask đang ở mạng khác, không phải Chuoi A

②  Ví đang chọn không phải ví đã được đúc token

③  Địa chỉ token trong config.ts sai

✅  Đã đạt CĐR mục 1: “triển khai được giao diện người dùng để kết nối với Ethereum thông qua RPC hoặc tương tác với MetaMask”.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Không đi tiếp khi chưa đọc được số dư — phần sau sẽ khó gấp bội. Thời lượng: 6 phút.</span></small>

<!-- page 62 of 72 -->

## **Luồng người dùng khi chuyển token**

**Mục 2**

Người dùng không được báo trước sẽ tưởng trang web bị treo

**1 · Cấp quyền**

MetaMask hiện lên lần 1: cho phép cầu nối rút token.

Sau đó 

**2 · Khoá token**

MetaMask hiện lên lần 2: xác nhận gọi hàm lock.

Sau đó 

**3 · Chờ relayer**

Giao diện hiện “Đang chuyển tiếp...” trong vài giây.

Sau đó 

**4 · Hoàn tất**

Nghe được sự kiện TokensMinted ở chuỗi B, báo thành công.

**Vì sao phải cấp quyền trước?**

Hợp đồng không tự lấy token trong ví bạn được. Bạn phải gọi approve() để cho phép trước. Nếu lần trước đã cấp đủ hạn mức thì lần này bỏ qua được bước 1 — giao diện nên tự kiểm tra allowance để đỡ phiền người dùng.

⚠️  Nhấn: phải có HAI lần ký. Đây là nguyên nhân số một khiến người dùng tưởng ứng dụng hỏng.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Thời lượng: 6 phút. Slide thiết kế trải nghiệm, không phải slide kỹ thuật.</span></small>

<!-- page 63 of 72 -->

## **Bước 21: Hàm chuyển token**

Thực hành 6/8 — đoạn mã trọng tâm của buổi

### **Mục 2**

frontend/src/App.tsx — hàm chuyenToken

import { Contract, parseUnits } from "ethers";

const [trangThai, setTrangThai] = useState("");

async function chuyenToken(signer: any, soLuongText: string) {

const soLuong = parseUnits(soLuongText, 18);

const token  = new Contract(CHAIN\_A.token,  TOKEN\_ABI, signer);

const bridge = new Contract(CHAIN\_A.bridge, SRC\_ABI,   signer);

const nguoiDung = await signer.getAddress();

// BUOC 1: cap quyen neu chua du

const hanMuc = await token.allowance(nguoiDung,

CHAIN\_A.bridge);

if (hanMuc < soLuong) {

setTrangThai("1/3 · Dang cho ban cap quyen...");

await (await token.approve(CHAIN\_A.bridge, soLuong)).wait();

}

// BUOC 2: khoa token

setTrangThai("2/3 · Dang khoa token o chuoi A...");

await (await bridge.lock(nguoiDung, soLuong, 31338)).wait();

setTrangThai("3/3 · Dang cho relayer chuyen tiep...");

}

Kết quả mong đợi

Nguoi dung thay lan luot:

1/3 · Dang cho ban cap quyen...

(MetaMask bat len lan 1)

2/3 · Dang khoa token o chuoi A...

(MetaMask bat len lan 2)

3/3 · Dang cho relayer

chuyen tiep...

Tham so thu 3 cua lock() la

destChainId = 31338 (chuoi B).

Ba trạng thái hiển thị cho người dùng, và một lần kiểm tra allowance để bỏ qua approve khi không cần.

**⚠  ERC20InsufficientAllowance**  thiếu await ở dòng approve — giao dịch chưa lên chuỗi đã gọi lock.

**⚠  user rejected action**  người dùng bấm Huỷ. Bắt lỗi và đặt lại trạng thái nút.

**⚠  Nút bấm hai lần ra hai giao dịch**  thêm biến dangXuLy và disabled cho nút.

**⚠  Số 18 trong parseUnits là gì?**  số chữ số thập phân của token. Ở đây viết cứng cho gọn; dự án thật phải đọc await token.decimals() — USDC chỉ có 6 chữ số.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đoạn mã trọng tâm của buổi. Đi chậm, giải thích biến trangThai. Thời lượng: 15 phút.</span></small>

<!-- page 64 of 72 -->

## **Bước 22: Báo hoàn tất khi token đã sang chuỗi B**

Thực hành 7/8 — đây là chỗ tạo cảm giác “hệ thống thật”

### **Mục 2**

frontend/src/App.tsx — theo dõi chuỗi B

import { JsonRpcProvider, Contract } from "ethers";

import { CHAIN\_B, DST\_ABI } from "./config";

// Lang nghe o CHUOI B - khong can vi, chi can doc

const providerB = new JsonRpcProvider(CHAIN\_B.rpc);

const bridgeB   = new Contract(CHAIN\_B.bridge,

DST\_ABI, providerB);

useEffect(() => {

const xuLy = (messageId: string, to: string,

amount: bigint) => {

if (to.toLowerCase() === diaChi?.toLowerCase()) {

setTrangThai("Hoan tat! Token da co o chuoi B.");

}

};

bridgeB.on("TokensMinted", xuLy);

return () => { bridgeB.off("TokensMinted", xuLy); };

}, [diaChi]);

Kết quả mong đợi

Vi sao dung JsonRpcProvider

chu khong phai MetaMask?

Vi MetaMask chi dang ket noi

vao chuoi A. Muon doc chuoi B,

trang web noi thang toi node

cua chuoi B - viec doc khong

can vi.

Vi sao phai goi .off()?

Neu khong, moi lan React ve

lai se dang ky them mot bo

lang nghe -> bao trung nhieu

lan.

Lắng nghe sự kiện TokensMinted ở chuỗi B — chính sự kiện DestinationBridge phát ra ở buổi 5. Giao diện KHÔNG gọi vào relayer.

**⚠  Sự kiện báo trùng nhiều lần**  quên gọi .off() trong phần dọn dẹp của useEffect.

**⚠  Không bao giờ thấy “Hoan tat”**  relayer chưa chạy. Giao diện không thay được relayer.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Giải thích vì sao dùng JsonRpcProvider ở đây. Nối lại với buổi 5: đây là công dụng của event TokensMinted. Thời lượng: 12 phút.</span></small>

<!-- page 65 of 72 -->

## **Bước 23: Chạy thử toàn hệ thống**

Thực hành 8/8 — khoảnh khắc nghiệm thu dự án 1

**Mục 2**

Bảo đảm đủ 5 thứ đang chạy: node chuỗi A, node chuỗi B, relayer, máy chủ React, và MetaMask đang ở mạng Chuoi A.

Thao tác trên trang web

1. Bam "Ket noi vi"

-> MetaMask hien len, bam Connect

2. Kiem tra so du token hien dung

3. Nhap 100 vao o so luong

4. Bam "Chuyen sang chuoi B"

5. MetaMask hien len lan 1 (approve)

-> Confirm

6. MetaMask hien len lan 2 (lock)

-> Confirm

7. Quan sat cua so relayer va trang web

Kết quả mong đợi

Trang web hien lan luot:

1/3 - Dang cho ban cap quyen...

2/3 - Dang khoa token o chuoi A...

3/3 - Dang cho relayer chuyen tiep...

Hoan tat! Token da co o chuoi B.

**⚠  MetaMask không hiện lên**  xem Console trình duyệt (F12) để đọc lỗi.

**⚠  Kẹt ở bước 3/3**  relayer chưa chạy, hoặc địa chỉ trong .env của relayer sai.

**⚠  could not decode result data**  ABI trong src/abi cũ, chép lại từ artifacts.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Cần 5 cửa sổ — nhắc sinh viên sắp xếp màn hình. Yêu cầu quay video 1 phút ngay tại lớp. Thời lượng: 15 phút.</span></small>

<!-- page 66 of 72 -->

## **Xử lý lỗi từ ví**

Bắt buộc phải có — không xử lý thì trang treo im lặng và bị trừ điểm

### **Mục 2**

| Mã lỗi / thông báo | Nghĩa là gì | Giao diện nên làm gì |
| --- | --- | --- |
| 4001 | Người dùng bấm Reject trong MetaMask | Hiện “Bạn đã huỷ giao dịch”, KHÔNG hiện lỗi kỹ thuật |
| 4902 | Mạng chưa được thêm vào MetaMask | Tự động gọi wallet_addEthereumChain để thêm giúp |
| insufficient funds | Ví không đủ ETH trả phí gas | Hiện “Ví của bạn không đủ ETH để trả phí” |
| Sai mạng | MetaMask đang ở mạng khác | Hiện nút “Chuyển sang Chuoi A” thay vì chỉ báo lỗi |
| Chưa cài MetaMask | window.ethereum không tồn tại | Hiện link tải MetaMask |

Mẫu bắt lỗi

try { await chuyenToken(...); }

catch (err: any) {

if (err.code === 4001) setTrangThai("Ban da huy giao dich");

else setTrangThai("Co loi xay ra, vui long thu lai");

console.error(err);   // chi tiet cho lap trinh vien

}

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đưa vào rubric chấm. Không xử lý lỗi thì trang web treo im lặng, người chấm sẽ trừ điểm. Thời lượng: 8 phút.</span></small>

<!-- page 67 of 72 -->

## **Những gì giao diện bắt buộc phải có**

**Tiêu chí chấm**

**Bắt buộc**

•  Hiển thị địa chỉ ví và tên mạng đang kết nối

•  Hiển thị số dư token ở cả hai chuỗi

•  Trạng thái rõ ràng cho từng bước của giao dịch

•  Vô hiệu hoá nút khi giao dịch đang chạy

•  Thông báo lỗi bằng ngôn ngữ người dùng hiểu được

**Điểm cộng**

•  Hiện mã giao dịch kèm liên kết tra cứu

•  Tự đề nghị chuyển mạng khi phát hiện sai mạng  (bước 19b)

•  Lịch sử các lần chuyển đã thực hiện

•  Bỏ qua bước approve khi hạn mức đã đủ  (bước 21)

•  Giao diện dùng được trên điện thoại

💡  Lời khuyên: làm cho đủ cột trái thật chắc rồi mới nghĩ tới cột phải. Nhiều tính năng dở dang bị trừ điểm hơn là ít tính năng làm tốt.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đọc rõ cho sinh viên. Chỉ ra hai mục điểm cộng đã có slide hướng dẫn sẵn. Thời lượng: 6 phút.</span></small>

<!-- page 68 of 72 -->

## **Lỗi thường gặp khi làm giao diện**

**Tham chiếu**

| Hiện tượng | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| could not decode result data | ABI không khớp hợp đồng đã triển khai | Chép lại ABI mới từ artifacts sang src/abi |
| Trang trắng, không có gì hiện ra | Lỗi JavaScript làm React dừng | Mở F12 rồi tab Console để đọc lỗi |
| call revert exception | Sai địa chỉ hợp đồng, hoặc đang ở sai mạng | Kiểm tra config.ts và mạng đang chọn trong MetaMask |
| Số dư luôn bằng 0 | MetaMask ở mạng khác hoặc ví khác | Kiểm tra tên mạng và tài khoản đang chọn |
| Sự kiện báo trùng nhiều lần | Đăng ký lắng nghe nhiều lần trong useEffect | Nhớ gọi .off() trong phần dọn dẹp |
| Nút bấm hai lần ra hai giao dịch | Chưa vô hiệu hoá nút khi đang xử lý | Thêm biến dangXuLy và disabled cho nút |
| Sửa hợp đồng xong giao diện lỗi | Địa chỉ hợp đồng đã đổi sau khi deploy lại | Cập nhật lại địa chỉ trong config.ts |

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Đọc lướt. Thời lượng: 4 phút.</span></small>

<!-- page 69 of 72 -->

## **Mốc kiểm tra 5: kết thúc dự án 1**

**Hết buổi 6**

**Đến đây bạn phải có được**

Kết nối ví thành công và hiển thị đúng số dư

Bấm một nút thực hiện được cả approve và lock

Trạng thái hiển thị lần lượt đủ ba bước

Nhận được thông báo hoàn tất khi token đã sang chuỗi B

Xử lý được ít nhất mã lỗi 4001 (người dùng huỷ)

**DỰ ÁN 1 ĐÃ HOÀN CHỈNH**

Bạn đã có đủ bốn thành phần: hợp đồng đầu cầu nguồn, hợp đồng đầu cầu đích, dịch vụ relayer và giao diện web.

Đây là một hệ thống phi tập trung hoàn chỉnh, đúng kiến trúc mà các dự án thật đang dùng — đúng chuẩn đầu ra “kết nối được back-end, front-end và blockchain”.

➡️  Buổi 7: hoàn thiện và bảo vệ dự án giữa kỳ. Kiểm tra đủ ba điều kiện bắt buộc trước khi tới lớp.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Nghiệm thu dự án 1. Thời lượng: 6 phút.</span></small>

<!-- page 70 of 72 -->

## **Chuẩn bị cho buổi 7: bảo vệ giữa kỳ**

**Bắt buộc**

Nhóm nào thiếu điều kiện sẽ không được bảo vệ

### **Độ phủ kiểm thử trên 80%**

Hardhat 3 có coverage tích hợp sẵn, không cần plugin ngoài. Chạy npx hardhat test --coverage và lưu ảnh chụp báo cáo để nộp.

### **Mã nguồn trên GitHub/GitLab**

Mọi thành viên phải có commit của riêng mình trong lịch sử.

### **Tài liệu README đầy đủ**

Người ngoài đọc là dựng lại và chạy được hệ thống của bạn.

**Buổi 7 diễn ra thế nào?**

60 phút đầu hoàn thiện tại lớp, 75 phút bảo vệ theo nhóm (mỗi nhóm 10 phút), 15 phút tổng kết.

**1**

**Mỗi nhóm chuẩn bị gì?**

Slide ngắn 5–7 trang, demo chạy được (kèm video dự phòng), và phân công ai nói phần nào.

**2**

**Có hỏi cá nhân không?**

Có. Mỗi thành viên phải giải thích được ít nhất một đoạn mã do chính mình viết.

**3**

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Dành 15 phút cuối buổi cho slide này. Đọc to ba điều kiện bắt buộc. Nêu rõ thứ tự nhóm bảo vệ.<br>KIỂM CHỨNG TRƯỚC KHI RA ĐỀ: chạy thử đúng cú pháp cờ coverage trên bản Hardhat 3 của lớp và chốt một câu lệnh duy nhất. Đây là điều kiện loại nhóm khỏi buổi bảo vệ nên không được để sinh viên gõ sai lệnh rồi tưởng mình chưa đạt.</span></small>

<!-- page 71 of 72 -->

## **Bài tập về nhà trước buổi 7**

Chia theo vai trò đã phân công từ đầu dự án

**Bài tập**

**1**

**2**

**3**

**4**

**5**

**Người làm hợp đồng**

Viết bổ sung test cho tới khi độ phủ vượt 80%. Chạy npx hardhat test --coverage và lưu ảnh chụp.

**Người làm relayer**

Hoàn thiện cơ chế quét bù khi khởi động lại và ghi nhật ký ra tệp. Viết hướng dẫn chạy relayer vào README.

**Người làm giao diện**

Hoàn thiện xử lý lỗi, vô hiệu hoá nút khi đang xử lý, hiển thị mã giao dịch. Quay video demo 2 phút.

**Người làm tài liệu**

Viết README: mục tiêu, sơ đồ kiến trúc, hướng dẫn cài đặt và chạy, ảnh chụp màn hình, giấy phép MIT.

**Cả nhóm**

Tập dượt bài trình bày ít nhất một lần, bấm giờ đúng 10 phút.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Chia việc rõ ràng cho từng vai trò. Thời lượng: 4 phút.</span></small>

<!-- page 72 of 72 -->

## **Tổng kết buổi 4, 5 và 6**

Hết dự án cầu nối. Từ buổi 8 bắt đầu dự án NFT Marketplace

**Bạn đã làm được**

Bốn hợp đồng trên hai chuỗi có cơ chế chống phát lại, một dịch vụ relayer bằng Node.js tự động chuyển tiếp, và một giao diện React kết nối MetaMask, đọc dữ liệu từ hợp đồng, gọi hàm ghi và lắng nghe sự kiện ở chuỗi khác.

**Bạn đã hiểu**

Vì sao cần cầu nối, mô hình khoá-và-đúc, vai trò relayer, ba lớp bảo vệ của hợp đồng đích, ba khái niệm Provider – Wallet – Contract, và vì sao trang web không quyết định tính đúng đắn.

**Cần nhớ nhất**

messageId duy nhất cho mỗi lệnh chuyển — thứ giữ cho cầu nối không bị rút tiền hai lần.

Ghi trạng thái trước, đúc token sau. Và luôn giả định relayer có thể bị chiếm quyền.

**Chặng tiếp theo**

Buổi 7: hoàn thiện và bảo vệ dự án giữa kỳ.

Từ buổi 8: dự án NFT Marketplace. Toàn bộ cách làm giao diện của buổi 6 sẽ được dùng lại từ buổi 11.

💬  Nhóm nào còn vướng hãy đăng vấn đề kèm ảnh chụp lỗi đầy đủ lên nhóm lớp ngay trong tuần này.

<small><span class="docvortex-page-footnote" data-block-type="page_footnote" style="color:#6b7280">Kết thúc bằng việc chốt thứ tự các nhóm bảo vệ ở buổi 7 để nhóm chủ động chuẩn bị.</span></small>