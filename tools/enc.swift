// enc.swift - reads length-prefixed JPEG frames on stdin (one per drawing), writes 1920x1080 H.264 at 24 fps (each drawing held two frames), then muxes AAC.
// swiftc -O tools/enc.swift -o build/enc ; build/enc out.mp4 song.m4a
import Foundation
import AVFoundation
import ImageIO
import CoreGraphics
let out = URL(fileURLWithPath: CommandLine.arguments[1]), aud = URL(fileURLWithPath: CommandLine.arguments[2])
let tmp = out.deletingLastPathComponent().appendingPathComponent("video-only.mov"); try? FileManager.default.removeItem(at: tmp); try? FileManager.default.removeItem(at: out)
let W = 1920, H = 1080
let w = try AVAssetWriter(outputURL: tmp, fileType: .mov)
let vs: [String: Any] = [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
  AVVideoColorPropertiesKey: [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2, AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2, AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2],
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 18_000_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: 48, AVVideoExpectedSourceFrameRateKey: 24, AVVideoH264EntropyModeKey: AVVideoH264EntropyModeCABAC, AVVideoAllowFrameReorderingKey: true]]
let vi = AVAssetWriterInput(mediaType: .video, outputSettings: vs); vi.expectsMediaDataInRealTime = false
let ad = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: vi, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
w.add(vi); w.startWriting(); w.startSession(atSourceTime: .zero)
let cs = CGColorSpace(name: CGColorSpace.sRGB)!; let inp = FileHandle.standardInput
func rd(_ n: Int) -> Data? { var d = Data(); while d.count < n { let c = inp.readData(ofLength: n - d.count); if c.isEmpty { return nil }; d.append(c) }; return d }
var n: Int64 = 0
while let h = rd(4) {
  let len = Int(h[0]) | Int(h[1]) << 8 | Int(h[2]) << 16 | Int(h[3]) << 24; guard let d = rd(len) else { break }
  autoreleasepool {
    guard let src = CGImageSourceCreateWithData(d as CFData, nil), let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fputs("bad frame\n", stderr); return }
    var pb: CVPixelBuffer?; CVPixelBufferPoolCreatePixelBuffer(nil, ad.pixelBufferPool!, &pb); let b = pb!
    CVPixelBufferLockBaseAddress(b, [])
    let c = CGContext(data: CVPixelBufferGetBaseAddress(b), width: W, height: H, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(b), space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
    c.interpolationQuality = .high; c.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H)); CVPixelBufferUnlockBaseAddress(b, [])
    for k in 0..<2 { while !vi.isReadyForMoreMediaData { usleep(1500) }; ad.append(b, withPresentationTime: CMTime(value: n * 2 + Int64(k), timescale: 24)) }
  }
  n += 1
}
vi.markAsFinished(); w.endSession(atSourceTime: CMTime(value: n * 2, timescale: 24))
let sem = DispatchSemaphore(value: 0); w.finishWriting { sem.signal() }; sem.wait()
if w.status != .completed { fputs("video failed \(String(describing: w.error))\n", stderr); exit(1) }
let comp = AVMutableComposition(); let va = AVURLAsset(url: tmp), aa = AVURLAsset(url: aud)
Task {
  do {
    let vt = try await va.loadTracks(withMediaType: .video)[0], at = try await aa.loadTracks(withMediaType: .audio)[0]
    let vd = try await va.load(.duration), adur = try await aa.load(.duration)
    let cv = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!, ca = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
    try cv.insertTimeRange(CMTimeRange(start: .zero, duration: vd), of: vt, at: .zero); try ca.insertTimeRange(CMTimeRange(start: .zero, duration: CMTimeMinimum(vd, adur)), of: at, at: .zero)
    let ex = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetPassthrough)!; ex.shouldOptimizeForNetworkUse = true
    try await ex.export(to: out, as: .mp4); print("drawings \(n) video \(vd.seconds) audio \(adur.seconds)"); try? FileManager.default.removeItem(at: tmp)
  } catch { fputs("mux failed \(error)\n", stderr) }
  sem.signal()
}
sem.wait()
