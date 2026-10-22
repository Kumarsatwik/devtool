export const SAMPLE_HAR = JSON.stringify(
  {
    log: {
      version: "1.2",
      creator: { name: "DataTools Sample", version: "1.0" },
      entries: [
        {
          startedDateTime: "2024-01-01T10:00:00.000Z",
          time: 142.5,
          request: {
            method: "GET",
            url: "https://example.com/",
            headers: [{ name: "Accept", value: "text/html" }],
          },
          response: {
            status: 200,
            statusText: "OK",
            headers: [
              { name: "Content-Type", value: "text/html; charset=utf-8" },
            ],
            content: {
              size: 18432,
              mimeType: "text/html",
              text: "<!DOCTYPE html>\n<html>\n<head><title>Example</title></head>\n<body>\n  <h1>Example Domain</h1>\n  <p>This domain is for use in examples.</p>\n</body>\n</html>",
            },
          },
          timings: {
            blocked: 2,
            dns: 12,
            connect: 34,
            ssl: 28,
            send: 1,
            wait: 78,
            receive: 15,
          },
        },
        {
          startedDateTime: "2024-01-01T10:00:00.210Z",
          time: 2350,
          request: {
            method: "GET",
            url: "https://example.com/assets/app.js",
            headers: [{ name: "Accept", value: "*/*" }],
          },
          response: {
            status: 200,
            statusText: "OK",
            headers: [
              { name: "Content-Type", value: "application/javascript" },
            ],
            content: { size: 1240000, mimeType: "application/javascript" },
          },
          timings: {
            blocked: 5,
            dns: 0,
            connect: 0,
            send: 1,
            wait: 1900,
            receive: 444,
          },
        },
        {
          startedDateTime: "2024-01-01T10:00:01.050Z",
          time: 89,
          request: {
            method: "GET",
            url: "https://api.example.com/v1/user",
            headers: [
              { name: "Authorization", value: "Bearer eyJhbGciOi..." },
              { name: "Origin", value: "https://example.com" },
            ],
          },
          response: {
            status: 401,
            statusText: "Unauthorized",
            headers: [{ name: "Content-Type", value: "application/json" }],
            content: {
              size: 96,
              mimeType: "application/json",
              text: '{"error":"invalid_token","message":"The access token has expired"}',
            },
          },
          timings: {
            blocked: 1,
            dns: 8,
            connect: 22,
            ssl: 18,
            send: 1,
            wait: 54,
            receive: 3,
          },
        },
        {
          startedDateTime: "2024-01-01T10:00:01.400Z",
          time: 0,
          request: {
            method: "GET",
            url: "https://fonts.othercdn.com/font.woff2",
            headers: [{ name: "Origin", value: "https://example.com" }],
          },
          response: {
            status: 0,
            statusText: "",
            headers: [],
            content: { size: 0, mimeType: "" },
          },
          timings: {
            blocked: -1,
            dns: -1,
            connect: -1,
            send: 0,
            wait: 0,
            receive: 0,
          },
        },
        {
          startedDateTime: "2024-01-01T10:00:02.000Z",
          time: 45,
          request: {
            method: "POST",
            url: "https://api.example.com/v1/login",
            headers: [
              { name: "Content-Type", value: "application/json" },
              { name: "Origin", value: "https://example.com" },
            ],
            postData: {
              mimeType: "application/json",
              text: '{"username":"demo@example.com","password":"••••••••"}',
            },
          },
          response: {
            status: 200,
            statusText: "OK",
            headers: [
              { name: "Content-Type", value: "application/json" },
              {
                name: "Access-Control-Allow-Origin",
                value: "https://example.com",
              },
            ],
            content: {
              size: 148,
              mimeType: "application/json",
              text: '{"token":"eyJhbGciOiJIUzI1NiIs...","expiresIn":3600,"user":{"id":42,"name":"Demo User"}}',
            },
          },
          timings: {
            blocked: 1,
            dns: 6,
            connect: 18,
            ssl: 12,
            send: 1,
            wait: 30,
            receive: 2,
          },
        },
        {
          startedDateTime: "2024-01-01T10:00:02.300Z",
          time: 45,
          request: {
            method: "GET",
            url: "https://example.com/old-page",
            headers: [],
          },
          response: {
            status: 301,
            statusText: "Moved Permanently",
            headers: [
              { name: "Location", value: "https://example.com/new-page" },
            ],
            content: { size: 0, mimeType: "text/html" },
            redirectURL: "https://example.com/new-page",
          },
          timings: {
            blocked: 1,
            dns: 9,
            connect: 20,
            ssl: 10,
            send: 1,
            wait: 12,
            receive: 2,
          },
        },
      ],
    },
  },
  null,
  2,
);
