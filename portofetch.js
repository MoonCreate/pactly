fetch("https://interface.gateway.uniswap.org/v2/data.v1.DataApiService/GetPortfolio", {
  "headers": {
    "accept": "*/*",
    "accept-language": "en,en-US;q=0.9,id;q=0.8",
    "cache-control": "no-cache",
    "connect-protocol-version": "1",
    "content-type": "application/json",
    "pragma": "no-cache",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Not:A-Brand\";v=\"99\", \"Google Chrome\";v=\"145\", \"Chromium\";v=\"145\"",
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": "\"Android\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "x-request-source": "uniswap-web",
    "Referer": "https://app.uniswap.org/"
  },
  "body": "{\"walletAccount\":{\"platformAddresses\":[{\"address\":\"0xb0175f56d4731C02aC9A30877fcD7c18C6af1858\"}]},\"chainIds\":[1,130,8453,42161,4217,143,501000101,137,196,10,56,43114,59144,480,324,1868,7777777,42220,81457],\"modifier\":{\"address\":\"0xb0175f56d4731C02aC9A30877fcD7c18C6af1858\"}}",
  "method": "POST"
});