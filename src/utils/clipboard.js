export const copyTextToClipboard = async (text) => {
    if (!text) {
        return false
    }

    try {
        if (navigator.clipboard?.writeText && window.isSecureContext) {
            await navigator.clipboard.writeText(text)
            return true
        }
    } catch (error) {
        console.warn('Clipboard API copy failed, trying fallback', error)
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '-9999px'
    textarea.style.opacity = '0'

    document.body.appendChild(textarea)

    const selection = document.getSelection()
    const previousRange = selection && selection.rangeCount > 0
        ? selection.getRangeAt(0)
        : null

    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)

    let copied = false
    try {
        copied = document.execCommand('copy')
    } catch (error) {
        console.warn('Fallback copy failed', error)
    }

    document.body.removeChild(textarea)

    if (selection) {
        selection.removeAllRanges()
        if (previousRange) {
            selection.addRange(previousRange)
        }
    }

    return copied
}
