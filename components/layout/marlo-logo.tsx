export function MarloIcon({ size = 28, color = "#fafafa" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(32, 14)">
        <g opacity="0.85">
          <path d="M-1,32 Q-6,27 -5,20 Q-3,14 -2,7" fill="none" stroke={color} strokeWidth="0.9"/>
          <ellipse cx="-4" cy="8" rx="2" ry="4" fill="none" stroke={color} strokeWidth="0.55" transform="rotate(-45,-4,8)"/>
          <ellipse cx="-5.5" cy="13" rx="2.2" ry="4.2" fill="none" stroke={color} strokeWidth="0.55" transform="rotate(-32,-5.5,13)"/>
          <ellipse cx="-6.5" cy="19" rx="2.4" ry="4.5" fill="none" stroke={color} strokeWidth="0.55" transform="rotate(-20,-6.5,19)"/>
          <ellipse cx="-6" cy="25" rx="2.2" ry="4.2" fill="none" stroke={color} strokeWidth="0.55" transform="rotate(-10,-6,25)"/>
        </g>
        <g opacity="0.85">
          <path d="M1,32 Q6,27 5,20 Q3,14 2,7" fill="none" stroke={color} strokeWidth="0.9"/>
          <ellipse cx="4" cy="8" rx="2" ry="4" fill="none" stroke={color} strokeWidth="0.55" transform="rotate(45,4,8)"/>
          <ellipse cx="5.5" cy="13" rx="2.2" ry="4.2" fill="none" stroke={color} strokeWidth="0.55" transform="rotate(32,5.5,13)"/>
          <ellipse cx="6.5" cy="19" rx="2.4" ry="4.5" fill="none" stroke={color} strokeWidth="0.55" transform="rotate(20,6.5,19)"/>
          <ellipse cx="6" cy="25" rx="2.2" ry="4.2" fill="none" stroke={color} strokeWidth="0.55" transform="rotate(10,6,25)"/>
        </g>
        <text x="0" y="25" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="16" fontWeight="400" fill={color}>M</text>
      </g>
    </svg>
  );
}

export function MarloWordmark({ color = "#fafafa" }: { color?: string }) {
  return (
    <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 15, fontWeight: 400, letterSpacing: "0.25em", color }}>
      MARLO
    </span>
  );
}
