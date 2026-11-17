"use client";

import { vi } from "../../lib/i18n/vi";
import { template } from "../../lib/format";
import { contact } from "../../config/contact";
import { usePlayer } from "../player/AudioPlayerContext";

const linkBase =
  "flex h-12 w-12 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white shadow-lg sm:h-auto sm:w-auto sm:justify-start sm:px-4 sm:py-3";

export function FloatingContact() {
  const { track } = usePlayer();
  // AudioPlayerBar is fixed at the bottom while a track is loaded (floating card on mobile,
  // full-width bar on desktop). Lift the widget above it (desktop bar is ~100px tall; measured in browser); otherwise keep a normal corner offset.
  const offset = track ? "bottom-28 md:bottom-32" : "bottom-4 md:bottom-6";
  return (
    <aside
      aria-label={vi.floatingContact.label}
      data-player-active={track ? "true" : "false"}
      className={`fixed right-4 z-40 ${offset}`}
    >
      <ul className="flex flex-col gap-2">
        <li>
          <a href={contact.zaloUrl} aria-label={vi.floatingContact.zaloAria} className={`${linkBase} bg-[#0068ff]`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
            </svg>
            <span className="sr-only sm:not-sr-only">{vi.floatingContact.zalo}</span>
          </a>
        </li>
        <li>
          <a
            href={contact.phone.tel}
            aria-label={template(vi.floatingContact.hotlineAria, { phone: contact.phone.display })}
            className={`${linkBase} bg-rust`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.6 3.6a1 1 0 0 1-.25 1z" />
            </svg>
            <span className="sr-only sm:not-sr-only">{vi.floatingContact.hotline}</span>
          </a>
        </li>
        <li>
          <a href={contact.messengerUrl} aria-label={vi.floatingContact.messengerAria} className={`${linkBase} bg-ink`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.45 5.4 3.7 7.1V22l3.4-1.9c.9.25 1.9.4 2.9.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2z" />
            </svg>
            <span className="sr-only sm:not-sr-only">{vi.floatingContact.messenger}</span>
          </a>
        </li>
      </ul>
    </aside>
  );
}
