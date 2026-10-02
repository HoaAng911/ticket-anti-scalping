/** Catalog hồ sơ năng lực Ban tổ chức + nghệ sĩ / ekip (lab hành chính VN) */

export const PROFILE_STATUSES = [
  { key: "draft", label: "Nháp" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Từ chối" },
];

export const MEMBER_ROLE_GROUPS = [
  { key: "ban_to_chuc", label: "Ban tổ chức / điều hành" },
  { key: "nghe_si", label: "Ca sĩ · Nghệ sĩ · Nhạc công · Vũ công" },
  { key: "ky_thuat", label: "Kỹ thuật sân khấu / sản xuất" },
  { key: "ho_tro", label: "Hỗ trợ · dịch vụ · khác" },
];

/** Toàn bộ vai trò — không bỏ sót ekip sự kiện */
export const MEMBER_ROLE_TITLES = [
  // Ban tổ chức
  { key: "truong_btc", label: "Trưởng ban tổ chức", group: "ban_to_chuc" },
  { key: "pho_btc", label: "Phó ban tổ chức", group: "ban_to_chuc" },
  { key: "thu_ky", label: "Thư ký BTC", group: "ban_to_chuc" },
  { key: "dieu_phoi", label: "Điều phối chương trình", group: "ban_to_chuc" },
  { key: "san_xuat", label: "Nhà sản xuất / Producer", group: "ban_to_chuc" },
  { key: "dao_dien", label: "Đạo diễn sân khấu", group: "ban_to_chuc" },
  { key: "tai_chinh", label: "Phụ trách tài chính", group: "ban_to_chuc" },
  { key: "phap_che", label: "Pháp chế / giấy phép", group: "ban_to_chuc" },
  { key: "truyen_thong", label: "Truyền thông / PR", group: "ban_to_chuc" },
  { key: "marketing", label: "Marketing / bán vé", group: "ban_to_chuc" },
  { key: "an_ninh", label: "An ninh / PCCC", group: "ban_to_chuc" },
  { key: "y_te", label: "Y tế sự kiện", group: "ban_to_chuc" },

  // Nghệ sĩ biểu diễn
  { key: "ca_si", label: "Ca sĩ", group: "nghe_si" },
  { key: "ca_si_khach_moi", label: "Ca sĩ khách mời", group: "nghe_si" },
  { key: "nghe_si", label: "Nghệ sĩ biểu diễn", group: "nghe_si" },
  { key: "nhac_cong", label: "Nhạc công", group: "nghe_si" },
  { key: "nhac_truong", label: "Nhạc trưởng / band leader", group: "nghe_si" },
  { key: "dj", label: "DJ", group: "nghe_si" },
  { key: "vu_cong", label: "Vũ công", group: "nghe_si" },
  { key: "bien_dao_mua", label: "Biên đạo múa", group: "nghe_si" },
  { key: "mc", label: "MC / người dẫn chương trình", group: "nghe_si" },
  { key: "dien_vien", label: "Diễn viên", group: "nghe_si" },
  { key: "nguoi_mau", label: "Người mẫu / vogue", group: "nghe_si" },
  { key: "ban_nhac", label: "Thành viên ban nhạc", group: "nghe_si" },
  { key: "hop_xuong", label: "Hợp xướng / backup vocal", group: "nghe_si" },

  // Kỹ thuật
  { key: "ky_thuat", label: "Kỹ thuật tổng hợp", group: "ky_thuat" },
  { key: "am_thanh", label: "Kỹ thuật âm thanh", group: "ky_thuat" },
  { key: "anh_sang", label: "Kỹ thuật ánh sáng", group: "ky_thuat" },
  { key: "hinh_anh", label: "Kỹ thuật hình ảnh / LED", group: "ky_thuat" },
  { key: "san_khau", label: "Dàn dựng sân khấu", group: "ky_thuat" },
  { key: "phuc_trang", label: "Phục trang / stylist", group: "ky_thuat" },
  { key: "trang_diem", label: "Trang điểm / makeup", group: "ky_thuat" },
  { key: "nhiep_anh", label: "Nhiếp ảnh / quay phim", group: "ky_thuat" },

  // Hỗ trợ
  { key: "hau_dai", label: "Hậu đài / stage manager", group: "ho_tro" },
  { key: "tiep_tan", label: "Tiếp đón / check-in", group: "ho_tro" },
  { key: "tinh_nguyen", label: "Tình nguyện viên", group: "ho_tro" },
  { key: "lai_xe", label: "Lái xe / logistics", group: "ho_tro" },
  { key: "khac", label: "Thành viên khác", group: "ho_tro" },
];

export const MEMBER_GENDERS = [
  { key: "", label: "— Chưa chọn —" },
  { key: "nam", label: "Nam" },
  { key: "nu", label: "Nữ" },
  { key: "khac", label: "Khác" },
];

export function memberRoleLabel(key) {
  return MEMBER_ROLE_TITLES.find((r) => r.key === key)?.label || key || "—";
}

export function memberRoleGroup(key) {
  const role = MEMBER_ROLE_TITLES.find((r) => r.key === key);
  if (!role) return null;
  return MEMBER_ROLE_GROUPS.find((g) => g.key === role.group) || null;
}

export function profileStatusLabel(key) {
  return PROFILE_STATUSES.find((s) => s.key === key)?.label || key || "—";
}

export function emptyDegree() {
  return { title: "", school: "", major: "", year: "", level: "" };
}

export function emptyCertificate() {
  return { name: "", issuer: "", number: "", issuedAt: "", expiresAt: "", notes: "" };
}

export function emptyAward() {
  return { title: "", year: "", organizer: "" };
}

export function emptyMember() {
  return {
    fullName: "",
    stageName: "",
    roleTitle: "khac",
    idNumber: "",
    dateOfBirth: "",
    gender: "",
    nationality: "Việt Nam",
    hometown: "",
    address: "",
    phone: "",
    email: "",
    emergencyContact: "",
    emergencyPhone: "",
    taxCode: "",
    bankAccount: "",
    bankName: "",
    unionMembership: "",
    languages: "",
    portfolioUrl: "",
    bio: "",
    qualifications: "",
    specialty: "",
    experienceYears: 0,
    pastEvents: "",
    degrees: [],
    certificates: [],
    awards: [],
    notes: "",
  };
}
