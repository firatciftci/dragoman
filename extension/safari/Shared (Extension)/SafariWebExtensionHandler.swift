import NaturalLanguage
import SafariServices
import Translation

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        let message = request?.userInfo?[SFExtensionMessageKey] as? [String: Any]

        if message?["type"] as? String == "translate" {
            Task {
                let payload = await self.translate(message ?? [:])
                self.reply(context, payload)
            }
            return
        }

        var payload: [String: Any] = [:]
        if message?["type"] as? String == "detect", let text = message?["text"] as? String {
            let recognizer = NLLanguageRecognizer()
            recognizer.processString(text)
            let hypotheses = recognizer.languageHypotheses(withMaximum: 3)
                .filter { $0.value >= 0.1 }
                .sorted { $0.value > $1.value }
            payload = [
                "isReliable": (hypotheses.first?.value ?? 0) >= 0.8,
                "languages": hypotheses.map {
                    ["language": $0.key.rawValue, "percentage": Int(($0.value * 100).rounded())]
                },
            ]
        }
        reply(context, payload)
    }

    private func reply(_ context: NSExtensionContext, _ payload: [String: Any]) {
        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: payload]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }

    private func translate(_ message: [String: Any]) async -> [String: Any] {
        guard #available(macOS 26.4, iOS 26.4, *) else { return ["error": "unavailable"] }
        guard let source = message["source"] as? String, let target = message["target"] as? String,
            let texts = message["texts"] as? [String]
        else { return ["error": "invalid"] }
        do {
            let session = TranslationSession(
                installedSource: Locale.Language(identifier: source),
                target: Locale.Language(identifier: target),
                preferredStrategy: .lowLatency
            )
            let responses = try await session.translations(
                from: texts.enumerated().map { .init(sourceText: $0.element, clientIdentifier: String($0.offset)) }
            )
            var ordered = Array(repeating: "", count: texts.count)
            for response in responses {
                if let index = Int(response.clientIdentifier ?? ""), ordered.indices.contains(index) {
                    ordered[index] = response.targetText
                }
            }
            return ["texts": ordered]
        } catch {
            return ["error": String(describing: error)]
        }
    }

}
