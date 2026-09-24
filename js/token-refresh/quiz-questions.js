/*
 * Token refresh quiz questions
 * ----------------------------
 * Read by js/execution-context/quiz.js (load this file first).
 * `correct` is the index of the right option.
 */
window.EC = window.EC || {};

EC.quiz = {
  perfect: 'You\'ve got the token refresh flow down. Ready for the Axios interceptor question.',
  questions: [
    {
      question: 'Why attach the access token in a request interceptor?',
      options: [
        'Because Axios requires interceptors for headers',
        'It centralizes auth: every request gets the token without repeating code in each API call',
        'It makes the access token never expire'
      ],
      correct: 1,
      explanation: 'The interceptor is one place that runs before every request, so no API call has to add the Authorization header itself.'
    },
    {
      question: 'The access token has expired. What does the server return, and who handles it?',
      options: [
        '200 OK, handled by the request interceptor',
        '500 error, handled by each screen',
        '401 Unauthorized, handled by the response interceptor'
      ],
      correct: 2,
      explanation: 'The server rejects the expired token with 401, and the response interceptor catches it to refresh and retry.'
    },
    {
      question: 'With a refresh queue, 10 requests get 401 at the same time. How many refresh calls are made?',
      options: ['1', '10', 'It depends on the order they return'],
      correct: 0,
      explanation: 'The first 401 sets isRefreshing and starts the refresh; the other nine are queued and retried with the new token.'
    },
    {
      question: 'What is originalRequest._retry for?',
      options: [
        'It makes Axios retry network errors automatically',
        'It stops an infinite loop: a request that already retried once isn\'t refreshed again',
        'It stores the refresh token on the request'
      ],
      correct: 1,
      explanation: 'If the retried request gets 401 again, _retry is already true, so the interceptor rejects instead of refreshing forever.'
    },
    {
      question: 'The refresh token itself has expired. What should happen?',
      options: [
        'Keep retrying the refresh until it works',
        'Ignore the error and show empty screens',
        'Reject the queued requests, clear authentication, and navigate to Login'
      ],
      correct: 2,
      explanation: 'The session can\'t be recovered, so fail the waiting requests, log out and send the user to Login.'
    },
    {
      question: 'In an Expo app, where should the refresh token be stored?',
      options: ['AsyncStorage', 'SecureStore (Keychain / Keystore)', 'A global JavaScript variable'],
      correct: 1,
      explanation: 'AsyncStorage is unencrypted. expo-secure-store keeps secrets in the iOS Keychain and Android Keystore.'
    }
  ]
};
