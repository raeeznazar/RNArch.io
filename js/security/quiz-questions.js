/*
 * SSL / TLS security quiz questions
 * ---------------------------------
 * Read by js/execution-context/quiz.js (load this file first).
 * `correct` is the index of the right option.
 */
window.EC = window.EC || {};

EC.quiz = {
  perfect: 'You\'ve got app network security down. Ready for the security question in your interview.',
  questions: [
    {
      question: 'What does HTTPS actually use today?',
      options: ['SSL 3.0', 'TLS (Transport Layer Security)', 'JWT'],
      correct: 1,
      explanation: 'SSL is deprecated. People still say "SSL", but HTTPS runs over TLS (1.2 or 1.3).'
    },
    {
      question: 'Which three things does TLS provide?',
      options: [
        'Encryption, integrity, server authentication',
        'Encryption, authorization, rate limiting',
        'Compression, caching, encryption'
      ],
      correct: 0,
      explanation: 'Confidentiality, integrity and authentication of the server. Authorization is your API\'s job.'
    },
    {
      question: 'The app calls api.example.com but the server presents a valid certificate for otherdomain.com. What should happen?',
      options: ['Connect, because the certificate is valid', 'Reject the connection: hostname mismatch', 'Connect, but show a warning'],
      correct: 1,
      explanation: 'A certificate only proves identity for the domains it lists. A hostname mismatch must be rejected.'
    },
    {
      question: 'Your app pins the exact server certificate. The server renews its certificate. What happens?',
      options: [
        'Nothing, pinning ignores renewals',
        'The app rejects the legitimate server until the app is updated',
        'The app automatically learns the new certificate'
      ],
      correct: 1,
      explanation: 'That\'s the rotation risk. Pinning the public key (SPKI) and shipping backup pins avoids it.'
    },
    {
      question: 'Your API uses HTTPS. Is storing the refresh token in AsyncStorage secure?',
      options: [
        'Yes, HTTPS encrypts it',
        'No, HTTPS protects data in transit; use Keychain / Keystore-backed secure storage',
        'Yes, AsyncStorage is encrypted by default'
      ],
      correct: 1,
      explanation: 'AsyncStorage is unencrypted app storage. Network security and storage security are separate problems.'
    },
    {
      question: 'Where can a third-party API secret key safely live?',
      options: [
        'In a .env file bundled into the React Native app',
        'Obfuscated inside the JS bundle',
        'On your server, which calls the third-party API for the app'
      ],
      correct: 2,
      explanation: 'Anything shipped to the client should be considered extractable, including .env values baked into the bundle. Keep secrets server-side.'
    }
  ]
};
