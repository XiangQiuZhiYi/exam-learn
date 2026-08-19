import Foundation
import PDFKit
import AppKit

let args = CommandLine.arguments
guard args.count == 5,
      let startPage = Int(args[3]),
      let endPage = Int(args[4]),
      let document = PDFDocument(url: URL(fileURLWithPath: args[1])) else {
    fputs("usage: render_pdfkit input.pdf output-dir start-page end-page\n", stderr)
    exit(1)
}

let outputDirectory = URL(fileURLWithPath: args[2], isDirectory: true)
try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)

for index in max(0, startPage - 1)..<min(endPage, document.pageCount) {
    guard let page = document.page(at: index) else { continue }
    let bounds = page.bounds(for: .mediaBox)
    let scale: CGFloat = 2.0
    let width = Int(bounds.width * scale)
    let height = Int(bounds.height * scale)
    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bitmapFormat: [],
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else { continue }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    NSColor.white.setFill()
    NSRect(x: 0, y: 0, width: width, height: height).fill()
    guard let context = NSGraphicsContext.current?.cgContext else { continue }
    context.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: context)
    NSGraphicsContext.restoreGraphicsState()

    guard let data = bitmap.representation(using: .png, properties: [:]) else { continue }
    let destination = outputDirectory.appendingPathComponent(String(format: "page-%03d.png", index + 1))
    try data.write(to: destination)
}
