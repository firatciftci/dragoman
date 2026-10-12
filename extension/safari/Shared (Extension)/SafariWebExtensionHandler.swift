import NaturalLanguage
import SafariServices

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        let message = request?.userInfo?[SFExtensionMessageKey] as? [String: Any]

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

        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: payload]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }

}
