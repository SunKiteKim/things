"use client";

import { useRef, useState } from "react";

type DaumPostcodeData = {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: "R" | "J";
  bname: string;
  buildingName: string;
};

type DaumNamespace = {
  Postcode: new (options: { oncomplete: (data: DaumPostcodeData) => void }) => {
    open: () => void;
  };
};

declare global {
  interface Window {
    daum?: DaumNamespace;
  }
}

let postcodeLoader: Promise<void> | null = null;

function loadPostcodeScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.daum?.Postcode) return Promise.resolve();
  if (postcodeLoader) return postcodeLoader;
  postcodeLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      postcodeLoader = null;
      reject(new Error("우편번호 서비스를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });
  return postcodeLoader;
}

function formatAddress(data: DaumPostcodeData) {
  const base = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
  const extra = [data.bname, data.buildingName].filter(Boolean).join(", ");
  return extra ? `${base} (${extra})` : base;
}

export function PostcodeAddress({
  zipCode = "",
  address = "",
  addressDetail = "",
  required = false,
}: {
  zipCode?: string;
  address?: string;
  addressDetail?: string;
  required?: boolean;
}) {
  const [zip, setZip] = useState(zipCode);
  const [addr, setAddr] = useState(address);
  const [detail, setDetail] = useState(addressDetail);
  const detailRef = useRef<HTMLInputElement>(null);

  async function openPostcode() {
    await loadPostcodeScript();
    if (!window.daum?.Postcode) return;
    new window.daum.Postcode({
      oncomplete(data) {
        setZip(data.zonecode);
        setAddr(formatAddress(data));
        window.setTimeout(() => detailRef.current?.focus(), 0);
      },
    }).open();
  }

  return (
    <>
      <div className="form-row">
        <label>우편번호</label>
        <div className="flex gap-2">
          <input className="field" name="zipCode" value={zip} placeholder="우편번호" readOnly required={required} />
          <button type="button" className="btn btn-ghost shrink-0" onClick={openPostcode}>
            우편번호 찾기
          </button>
        </div>
      </div>
      <div className="form-row">
        <label>주소</label>
        <div>
          <input className="field" name="address" value={addr} placeholder="주소" readOnly required={required} />
        </div>
      </div>
      <div className="form-row">
        <label>상세주소</label>
        <div>
          <input
            ref={detailRef}
            className="field"
            name="addressDetail"
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder="상세주소"
          />
        </div>
      </div>
    </>
  );
}
