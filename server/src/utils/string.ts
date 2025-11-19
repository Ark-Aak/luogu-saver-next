export function truncateUtf8(str: string, maxLength: number): string {
    let byteLength = 0;
    let endIndex = 0;

    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);
        if (charCode <= 0x7F) {
            byteLength += 1;
        }
        else if (charCode <= 0x7FF) {
            byteLength += 2;
        }
        else if (charCode <= 0xFFFF) {
            byteLength += 3;
        }
        else {
            byteLength += 4;
        }

        if (byteLength > maxLength) {
            break;
        }

        endIndex = i + 1;
    }

    return str.slice(0, endIndex);
}