interface PromisifiedXHR extends XMLHttpRequest {
  send(): Promise<XMLHttpRequest>;
}

interface XHRError {
  status: number;
  statusText: string;
}

export default function promisify(xhr: XMLHttpRequest): PromisifiedXHR {
  const oldSend = xhr.send;
  (xhr as any).send = function (...xhrArguments: any[]) {
    return new Promise<XMLHttpRequest>(function (resolve, reject) {
      xhr.onload = function () {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject({
            status: xhr.status,
            statusText: xhr.statusText,
          } as XHRError);
        } else {
          resolve(xhr);
        }
      };
      xhr.onerror = function () {
        reject({
          status: xhr.status,
          statusText: xhr.statusText,
        } as XHRError);
      };
      try {
        oldSend.apply(xhr, xhrArguments);
      } catch (e) {}
    });
  };
  return xhr as PromisifiedXHR;
}
