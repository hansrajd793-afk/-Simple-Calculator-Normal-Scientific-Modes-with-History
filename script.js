class Calculator {
    constructor(previousOperandTextElement, currentOperandTextElement) {
        this.previousOperandTextElement = previousOperandTextElement;
        this.currentOperandTextElement = currentOperandTextElement;
        this.clear();
        this.loadHistory();
    }

    clear() {
        this.currentOperand = '0';
        this.previousOperand = '';
        this.currentExpression = ''; // Track full string expression for display
        this.justComputed = false;
    }

    delete() {
        if (this.justComputed) {
            this.clear();
            return;
        }
        if (this.currentOperand === '0') return;

        // Remove last char. Careful with specific strings like 'sin(' but simple delete is okay for now
        this.currentOperand = this.currentOperand.toString().slice(0, -1);
        if (this.currentOperand === '') this.currentOperand = '0';
    }

    appendNumber(number) {
        if (this.justComputed) {
            this.currentOperand = '';
            this.justComputed = false;
        }
        if (number === '.' && this.currentOperand.includes('.')) {
            // Basic check, might fail for complex expressions like 1.2 + 3.4
            // For equation mode, we might want to allow it and let the parser error? 
            // Or better regex check. For now, simple append.
        }
        if (this.currentOperand === '0' && number !== '.') {
            this.currentOperand = number.toString();
        } else {
            this.currentOperand = this.currentOperand.toString() + number.toString();
        }
    }

    appendOperation(operation) {
        if (this.justComputed) this.justComputed = false;
        if (this.currentOperand === '0' && operation !== '-') {
            // Allow minus for negative numbers
        }
        this.currentOperand += operation;
    }

    appendScientific(func) {
        if (this.justComputed) {
            this.currentOperand = '';
            this.justComputed = false;
        }
        if (this.currentOperand === '0') this.currentOperand = '';
        this.currentOperand += func;
    }

    compute() {
        let expression = this.currentOperand;

        // Sanitize and replace visual tokens with JS Math
        let sanitized = expression
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/\^/g, '**')
            .replace(/π/g, 'Math.PI')
            .replace(/e/g, 'Math.E')
            .replace(/sin\(/g, 'Math.sin(')
            .replace(/cos\(/g, 'Math.cos(')
            .replace(/tan\(/g, 'Math.tan(')
            .replace(/log\(/g, 'Math.log10(')
            .replace(/ln\(/g, 'Math.log(')
            .replace(/√\(/g, 'Math.sqrt(')
            .replace(/√/g, 'Math.sqrt')
            .replace(/abs\(/g, 'Math.abs(')
            .replace(/exp\(/g, 'Math.exp(')
            .replace(/asin\(/g, 'Math.asin(');

        // Handle percentage (simple approach: /100)
        // Note: 50% -> 0.5. 50+10% -> 50 + 0.1? Calculator standard is complex. 
        // Simple scientific often treats % as /100 immediately or mod. 
        // Let's assume Modulo for % context in scientific, or /100?
        // "100 * 5%" -> "100 * 0.05".
        // Let's map % to /100 for now as it's common in basic apps.
        // .replace(/%/g, '/100'); 

        // Actually, for "Premium", users might expect Modulo:
        // .replace(/%/g, '%'); // This works for JS modulo.

        try {
            // Safe evaluation (relative to browser context, restricted to Math)
            // Using Function constructor is safer than eval() but still powerful. 
            // We restrict scope by not passing variables.
            const result = new Function('"use strict";return (' + sanitized + ')')();

            if (!isFinite(result) || isNaN(result)) {
                this.currentOperand = "Error";
                this.justComputed = true;
                return;
            }

            // Formatting
            const precision = (num) => Math.round(num * 1000000000) / 1000000000;
            const finalResult = precision(result);

            this.addToHistory(expression, finalResult);
            this.previousOperand = expression + ' =';
            this.currentOperand = finalResult.toString();
            this.justComputed = true;

        } catch (e) {
            this.currentOperand = "Error";
            this.justComputed = true;
            console.error(e);
        }
    }

    updateDisplay() {
        // Just show the string as is for equation mode
        this.currentOperandTextElement.innerText = this.currentOperand;
        this.previousOperandTextElement.innerText = this.previousOperand;
    }

    // --- History Features (Same as before) ---
    addToHistory(expression, result) {
        const historyItem = { expression, result, timestamp: new Date().toISOString() };
        let history = JSON.parse(localStorage.getItem('calcHistory')) || [];
        history.unshift(historyItem);
        if (history.length > 50) history.pop();
        localStorage.setItem('calcHistory', JSON.stringify(history));
        this.renderHistory();
    }

    loadHistory() {
        this.renderHistory();
    }

    clearHistory() {
        localStorage.removeItem('calcHistory');
        this.renderHistory();
    }

    renderHistory() {
        const historyList = document.querySelector('.history-list');
        if (!historyList) return;

        const history = JSON.parse(localStorage.getItem('calcHistory')) || [];
        historyList.innerHTML = '';

        history.forEach(item => {
            const el = document.createElement('div');
            el.classList.add('history-item');
            el.innerHTML = `
                <div class="history-expression">${item.expression} =</div>
                <div class="history-result">${item.result}</div>
            `;
            el.addEventListener('click', () => {
                this.currentOperand = item.result.toString();
                this.justComputed = false; // Allow editing again
                this.updateDisplay();
                toggleHistory();
            });
            historyList.appendChild(el);
        });
    }
}

// UI Setup
const numberButtons = document.querySelectorAll('[data-number]');
const operationButtons = document.querySelectorAll('[data-operation]');
const scientificButtons = document.querySelectorAll('[data-scientific]');
const equalsButton = document.querySelector('[data-equals]');
const deleteButton = document.querySelector('[data-delete]');
const allClearButton = document.querySelector('[data-all-clear]');
const previousOperandTextElement = document.querySelector('[data-previous-operand]');
const currentOperandTextElement = document.querySelector('[data-current-operand]');

const calculator = new Calculator(previousOperandTextElement, currentOperandTextElement);

// Animations
const animateButton = (button) => {
    button.classList.remove('pressed');
    void button.offsetWidth;
    button.classList.add('pressed');
};

// Event Listeners
numberButtons.forEach(button => {
    button.addEventListener('click', () => {
        calculator.appendNumber(button.innerText);
        calculator.updateDisplay();
        animateButton(button);
    });
});

operationButtons.forEach(button => {
    button.addEventListener('click', () => {
        calculator.appendOperation(button.innerText);
        calculator.updateDisplay();
        animateButton(button);
    });
});

scientificButtons.forEach(button => {
    button.addEventListener('click', () => {
        let val = button.innerText;
        // Append logical token
        if (['sin', 'cos', 'tan', 'log', 'ln', '√', 'abs', 'exp', 'asin'].includes(val)) {
            val += '(';
        }
        calculator.appendScientific(val);
        calculator.updateDisplay();
        animateButton(button);
    });
});

equalsButton.addEventListener('click', button => {
    calculator.compute();
    calculator.updateDisplay();
    animateButton(equalsButton);
});

allClearButton.addEventListener('click', button => {
    calculator.clear();
    calculator.updateDisplay();
    animateButton(allClearButton);
});

deleteButton.addEventListener('click', button => {
    calculator.delete();
    calculator.updateDisplay();
    animateButton(deleteButton);
});

// Mode And History Logic
const calculatorEl = document.getElementById('calculator');
const navButtons = document.querySelectorAll('.nav-btn');
const historyPanel = document.querySelector('.history-panel');
const historyToggleBtn = document.querySelector('.history-toggle');
const closeHistoryBtn = document.querySelector('.close-history');
const clearHistoryBtn = document.querySelector('.clear-history-btn');

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        if (mode === 'scientific') {
            calculatorEl.classList.add('scientific');
        } else {
            calculatorEl.classList.remove('scientific');
        }
    });
});

function toggleHistory() {
    historyPanel.classList.toggle('open');
}

if (historyToggleBtn) historyToggleBtn.addEventListener('click', toggleHistory);
if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', toggleHistory);
if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => calculator.clearHistory());

// Keyboard Support
document.addEventListener('keydown', e => {
    if (e.repeat) return;
    let key = e.key;
    const buttonMap = {
        'Enter': '=',
        'Backspace': 'DEL',
        'Escape': 'AC',
        '*': '×',
        '/': '÷'
    };
    if (buttonMap[key]) key = buttonMap[key];

    // Animation
    const buttons = Array.from(document.querySelectorAll('button'));
    const button = buttons.find(b => b.innerText === key);
    if (button) animateButton(button);

    if ((key >= 0 && key <= 9) || key === '.') {
        calculator.appendNumber(key);
    } else if (['+', '-', '×', '÷', '^', '(', ')'].includes(key)) {
        calculator.appendOperation(key);
    } else if (key === '=') {
        calculator.compute();
    } else if (key === 'DEL') {
        calculator.delete();
    } else if (key === 'AC') {
        calculator.clear();
    }
    calculator.updateDisplay();
});
