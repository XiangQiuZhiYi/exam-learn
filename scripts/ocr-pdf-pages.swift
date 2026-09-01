import AppKit
import Foundation
import PDFKit
import Vision

struct OCRPage: Codable {
    let page: Int
    let text: String
}

guard CommandLine.arguments.count == 3 else {
    FileHandle.standardError.write(Data("用法：swift scripts/ocr-pdf-pages.swift <输入.pdf> <输出.json>\n".utf8))
    exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
guard let document = PDFDocument(url: inputURL) else {
    FileHandle.standardError.write(Data("无法打开 PDF：\(inputURL.path)\n".utf8))
    exit(1)
}

var output: [OCRPage] = []
for index in 0..<document.pageCount {
    try autoreleasepool {
        guard let page = document.page(at: index) else { return }
        let bounds = page.bounds(for: .mediaBox)
        let targetSize = NSSize(width: min(1900, bounds.width * 2.2), height: min(2700, bounds.height * 2.2))
        let image = page.thumbnail(of: targetSize, for: .mediaBox)
        guard let data = image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: data),
              let cgImage = bitmap.cgImage else {
            throw NSError(domain: "SAOCR", code: 1, userInfo: [NSLocalizedDescriptionKey: "第 \(index + 1) 页无法渲染"])
        }

        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        request.recognitionLanguages = ["zh-Hans", "en-US"]
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try handler.perform([request])
        let observations = (request.results ?? []).sorted {
            if abs($0.boundingBox.midY - $1.boundingBox.midY) > 0.012 {
                return $0.boundingBox.midY > $1.boundingBox.midY
            }
            return $0.boundingBox.minX < $1.boundingBox.minX
        }
        let text = observations.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
        output.append(OCRPage(page: index + 1, text: text))
        FileHandle.standardError.write(Data("OCR \(index + 1)/\(document.pageCount)\n".utf8))
    }
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
try encoder.encode(output).write(to: outputURL, options: .atomic)
