"use client";

import { useRouter } from "next/navigation";
import NavIcon from "./NavIcons";

/** "X" close control on the mobile "7g" full-screen Menu — goes back to whatever page opened it. */
export default function MenuBackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Tutup menu"
      className="-mr-2 -mt-1 flex h-11 w-11 items-center justify-center text-white"
    >
      <NavIcon name="close" size={19} />
    </button>
  );
}
