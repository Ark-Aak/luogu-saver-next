export function truncateUtf8(str: string, maxLength: number): string {
    let byteLength = 0;
    let endIndex = 0;

    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);
        if (charCode <= 0x7f) {
            byteLength += 1;
        } else if (charCode <= 0x7ff) {
            byteLength += 2;
        } else if (charCode <= 0xffff) {
            byteLength += 3;
        } else {
            byteLength += 4;
        }

        if (byteLength > maxLength) {
            break;
        }

        endIndex = i + 1;
    }

    return str.slice(0, endIndex);
}

export function getRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
