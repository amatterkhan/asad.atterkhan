"""Minimal lossless Aseprite/LibreSprite (.ase) writer: RGBA, any number of layers and frames."""
import struct, zlib

def _chunk(t, data): return struct.pack("<IH", len(data) + 6, t) + data
def _string(s): b = s.encode(); return struct.pack("<H", len(b)) + b

def write_ase(path, width, height, layers, ms=100):
    """layers: list of (name, [frame0, frame1, ...]) where each frame is an RGBA PIL image or None."""
    nframes = max(len(f) for _, f in layers)
    body = b""
    for i in range(nframes):
        chunks = []
        if i == 0:
            for name, _ in layers:
                chunks.append(_chunk(0x2004, struct.pack("<HHHHHHB3x", 3, 0, 0, 0, 0, 0, 255) + _string(name)))
        for li, (_, frames) in enumerate(layers):
            f = frames[i] if i < len(frames) else None
            if f is None: continue
            pix = zlib.compress(f.convert("RGBA").tobytes())
            chunks.append(_chunk(0x2005, struct.pack("<HhhBH7xHH", li, 0, 0, 255, 2, width, height) + pix))
        data = b"".join(chunks)
        body += struct.pack("<IHHHHI", 16 + len(data), 0xF1FA, min(len(chunks), 0xFFFF), ms, 0, len(chunks)) + data
    head = struct.pack("<IHHHHHIHIIBBBBHBBhhHH", 128 + len(body), 0xA5E0, nframes, width, height, 32, 1, ms,
                       0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 16, 16)
    with open(path, "wb") as fh:
        fh.write(head + b"\0" * (128 - len(head)) + body)
