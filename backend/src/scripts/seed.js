/**
 * Seed organizer + sự kiện mẫu khớp eventChainId 1/2 trên contract.
 * Chạy: node src/scripts/seed.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Event from "../models/Event.js";
import OrganizerProfile from "../models/OrganizerProfile.js";

async function upsertUser({ email, password, role, walletAddress, displayName }) {
  let user = await User.findOne({ email });
  if (!user) {
    const doc = {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role,
      displayName: displayName || "",
      isActive: true,
    };
    if (walletAddress) doc.walletAddress = walletAddress;
    user = await User.create(doc);
    console.log(`Created ${role}:`, email, "/", password);
  } else {
    let changed = false;
    if (user.role !== role) {
      user.role = role;
      changed = true;
    }
    if (user.isActive === false) {
      user.isActive = true;
      changed = true;
    }
    if (changed) {
      await user.save();
      console.log(`Updated ${email} rồi role=${role}, active=true`);
    } else {
      console.log(`${role} exists:`, email);
    }
  }
  return user;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  await upsertUser({
    email: "admin@ticket.local",
    password: "admin123",
    role: "admin",
    displayName: "System Admin",
  });

  const user = await upsertUser({
    email: "organizer@ticket.local",
    password: "organizer123",
    role: "organizer",
    walletAddress: "0xdecc0bf86a34de96b161b1f910ce2684d36bb4b4",
    displayName: "Demo Organizer",
  });

  const existing = await Event.findOne({ title: "Đêm Nhạc Anti-Scalping" });
  if (existing) {
    console.log("Event already seeded:", existing._id.toString());
  } else {
    const event = await Event.create({
      title: "Đêm Nhạc Anti-Scalping",
      description:
        "Sự kiện demo bán vé NFT trên mạng geth private-net (chainId 12345). Tối đa 2 vé/ví/loại. Resale ≤ 110%, khóa chuyển nhượng ngắn trên local.",
      location: "Nhà hát Demo, TP.HCM",
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      organizer: user._id,
      coverImage: "",
      ticketTypes: [
        { name: "Standard", price: 0.01, totalSupply: 100, eventChainId: 1 },
        { name: "VIP", price: 0.05, totalSupply: 20, eventChainId: 2 },
      ],
    });
    console.log("Seeded event:", event._id.toString());
  }

  const profileCode = "HSNL-2026-DEMO01";
  let profile = await OrganizerProfile.findOne({ profileCode });
  const demoMembers = [
    {
      fullName: "Nguyễn Văn Organizer",
      stageName: "",
      roleTitle: "truong_btc",
      idNumber: "079085001234",
      phone: "0901000001",
      email: "organizer@ticket.local",
      qualifications: "Cử nhân Quản trị Kinh doanh; chứng chỉ tổ chức sự kiện Soft Skills Pro",
      specialty: "Điều phối tổng thể / pháp lý sự kiện",
      experienceYears: 8,
      pastEvents: "Đêm Nhạc Lab 2024; Festival Demo 2025",
    },
    {
      fullName: "Trần Thị Kỹ Thuật",
      roleTitle: "am_thanh",
      idNumber: "079090002345",
      phone: "0901000002",
      email: "tech@ticket.local",
      qualifications: "Kỹ sư Điện – Điện tử; chứng chỉ an toàn sân khấu",
      specialty: "Âm thanh – ánh sáng – kết cấu sân khấu",
      experienceYears: 6,
      pastEvents: "Concert Indoor Q1 2025; Outdoor Fan Meeting",
    },
    {
      fullName: "Lê Minh An Ninh",
      roleTitle: "an_ninh",
      idNumber: "079088003456",
      phone: "0901000003",
      email: "security@ticket.local",
      qualifications: "Chứng chỉ PCCC cơ sở; huấn luyện sơ cấp cứu",
      specialty: "An ninh đám đông / phương án thoát hiểm",
      experienceYears: 10,
      pastEvents: "Hội nghị VHTT 2025; Night Run Demo",
    },
    {
      fullName: "Phạm Thu Tài Chính",
      roleTitle: "tai_chinh",
      idNumber: "079092004567",
      phone: "0901000004",
      email: "finance@ticket.local",
      qualifications: "Cử nhân Kế toán; chứng chỉ hành nghề kế toán",
      specialty: "Thu – chi sự kiện, đối soát vé",
      experienceYears: 7,
      pastEvents: "Tour Lab 2024",
    },
    {
      fullName: "Nguyễn Thanh Ca",
      stageName: "Thanh Ca",
      roleTitle: "ca_si",
      idNumber: "079095005678",
      dateOfBirth: "1995-08-12",
      gender: "nu",
      nationality: "Việt Nam",
      hometown: "Hà Nội",
      address: "22 Pasteur, Quận 1, TP.HCM",
      phone: "0901000005",
      email: "singer@ticket.local",
      emergencyContact: "Nguyễn Văn A (bố)",
      emergencyPhone: "0901999000",
      taxCode: "8750123456",
      bankAccount: "0123456789",
      bankName: "Vietcombank",
      unionMembership: "Hội Nhạc sĩ Việt Nam",
      languages: "Tiếng Việt, English",
      portfolioUrl: "https://ticket.local/artists/thanh-ca",
      bio: "Ca sĩ pop ballad, từng đoạt giải Sao Mai và biểu diễn nhiều show lớn tại TP.HCM.",
      qualifications: "Giải nhất Sao Mai 2022; Học viện Âm nhạc HN",
      specialty: "Pop ballad / R&B",
      experienceYears: 9,
      pastEvents: "Đêm Nhạc Lab 2024; Live Session Q3 2025",
      degrees: [
        {
          title: "Cử nhân Thanh nhạc",
          level: "Cử nhân",
          school: "Học viện Âm nhạc Quốc gia Việt Nam",
          major: "Thanh nhạc",
          year: "2017",
        },
      ],
      certificates: [
        {
          name: "Chứng chỉ hành nghề biểu diễn nghệ thuật",
          issuer: "Sở VHTT TP.HCM",
          number: "GP-BD-2023-118",
          issuedAt: "2023-03-15",
          expiresAt: "2028-03-15",
        },
        {
          name: "Chứng nhận an toàn sân khấu",
          issuer: "Trung tâm Đào tạo sự kiện",
          number: "ATSK-8821",
          issuedAt: "2024-01-10",
          expiresAt: "",
        },
      ],
      awards: [
        { title: "Giải nhất Sao Mai", year: "2022", organizer: "Đài Truyền hình Việt Nam" },
      ],
    },
    {
      fullName: "Trần Khách Mời",
      stageName: "Guest Star T",
      roleTitle: "ca_si_khach_moi",
      phone: "0901000006",
      email: "guest@ticket.local",
      specialty: "EDM vocal",
      experienceYears: 5,
      pastEvents: "Festival Demo 2025",
    },
    {
      fullName: "Hoàng Văn Guitar",
      stageName: "",
      roleTitle: "nhac_cong",
      phone: "0901000007",
      qualifications: "Cử nhân Guitar cổ điển",
      specialty: "Guitar lead / acoustic",
      experienceYears: 12,
      pastEvents: "Tour Lab 2024",
    },
    {
      fullName: "Đỗ Thị Múa",
      stageName: "Dancer Do",
      roleTitle: "vu_cong",
      phone: "0901000008",
      qualifications: "Cử nhân Biểu diễn múa đương đại",
      specialty: "Contemporary / commercial",
      experienceYears: 7,
      pastEvents: "Concert Indoor Q1 2025",
    },
    {
      fullName: "Vũ Biên Đạo",
      roleTitle: "bien_dao_mua",
      phone: "0901000009",
      specialty: "Biên đạo commercial dance",
      experienceYears: 11,
      pastEvents: "Festival Demo 2025",
    },
    {
      fullName: "Ngô MC Minh",
      stageName: "MC Minh",
      roleTitle: "mc",
      phone: "0901000010",
      specialty: "Dẫn chương trình concert / talkshow",
      experienceYears: 8,
      pastEvents: "Đêm Nhạc Lab 2024",
    },
    {
      fullName: "Lý DJ Night",
      stageName: "DJ Night",
      roleTitle: "dj",
      phone: "0901000011",
      specialty: "House / Techno",
      experienceYears: 6,
      pastEvents: "Outdoor Fan Meeting",
    },
    {
      fullName: "Phan Nghệ Sĩ",
      roleTitle: "nghe_si",
      phone: "0901000012",
      specialty: "Ảo thuật / performance art",
      experienceYears: 15,
      pastEvents: "Hội nghị VHTT 2025",
    },
  ];

  if (profile) {
    const roles = new Set(profile.members.map((m) => m.roleTitle));
    const missing = demoMembers.filter((m) => !roles.has(m.roleTitle));
    let changed = false;
    if (missing.length) {
      profile.members.push(...missing);
      changed = true;
      console.log(`Updated ${profileCode}: +${missing.length} members (ca sĩ, nhạc công…)`);
    }
    // Bổ sung hồ sơ đầy đủ cho ca sĩ demo nếu còn thiếu
    const singer = profile.members.find((m) => m.roleTitle === "ca_si");
    const singerDemo = demoMembers.find((m) => m.roleTitle === "ca_si");
    if (singer && singerDemo && !(singer.degrees || []).length) {
      Object.assign(singer, singerDemo);
      changed = true;
      console.log(`Enriched singer profile: ${singer.stageName || singer.fullName}`);
    }
    if (changed) {
      if (profile.status === "approved") {
        profile.status = "draft";
        profile.reviewedAt = null;
        profile.reviewedBy = null;
      }
      await profile.save();
    } else {
      console.log("Organizer profile exists:", profileCode, `(${profile.members.length} members)`);
    }
  } else {
    profile = await OrganizerProfile.create({
      profileCode,
      organizationName: "Công ty TNHH TicketChain Demo",
      taxCode: "0312345678",
      address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
      phone: "028-3822-0000",
      email: "organizer@ticket.local",
      website: "https://ticket.local",
      businessField: "Tổ chức sự kiện âm nhạc & giải trí",
      yearsOperating: 5,
      legalRepName: "Nguyễn Văn Organizer",
      legalRepTitle: "Giám đốc",
      legalRepIdNumber: "079085001234",
      linkedUser: user._id,
      status: "draft",
      notes: "Hồ sơ mẫu lab — đủ BTC + ca sĩ, nghệ sĩ, nhạc công, vũ công, MC, DJ…",
      members: demoMembers,
    });
    console.log(
      "Seeded organizer competency profile:",
      profile.profileCode,
      `(${profile.members.length} members)`
    );
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
