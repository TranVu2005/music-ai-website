// Single source for contact details. ALL values are fake placeholders for the Phase 1 demo.
// Replace with real values and remove `isPlaceholder` before any real use.
export type ContactConfig = {
  isPlaceholder: boolean;
  phone: { display: string; tel: string };
  zaloUrl: string;
  messengerUrl: string;
  email: string;
  address: string;
  socials: { id: "facebook" | "youtube" | "tiktok"; url: string }[];
};

export const contact: ContactConfig = {
  isPlaceholder: true,
  phone: { display: "0900 000 000", tel: "tel:+84900000000" },
  zaloUrl: "https://zalo.me/0900000000",
  messengerUrl: "https://m.me/tomahu.music.placeholder",
  email: "hello@example.com",
  address: "Thành phố Hồ Chí Minh, Việt Nam (địa chỉ minh họa)",
  socials: [
    { id: "facebook", url: "https://facebook.com/tomahu.music.placeholder" },
    { id: "youtube", url: "https://youtube.com/@tomahu-music-placeholder" },
    { id: "tiktok", url: "https://tiktok.com/@tomahu.music.placeholder" },
  ],
};
