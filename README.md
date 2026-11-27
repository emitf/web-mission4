# Clear Count
## Mission M4 · Web Development I

Clear Count is a small app for keeping track of your money. If you have money in a few different banks, some cash, euros and dollars, and friends who owe you or you owe them, it gets hard to know how much you actually have. Clear Count puts it all in one place.

You don't have to write down every single thing you spend. You just put in what each account has right now, whenever you check (once a week for example), and the app adds it all up, converts between euros and dollars, and shows you how your total changes over time.

## What it does

- Add your accounts (bank, savings or cash), in euros or dollars, and edit or delete them whenever you want.
- Update all your balances at once with the "Update balances" button.
- See your total in euros or dollars. It uses the real exchange rate from the European Central Bank.
- Keep track of IOUs: money people owe you and money you owe. When someone pays you back, you pick which account the money went into and the balance updates on its own. If you click it by mistake, you can undo it.
- See your net balance, which is your total plus what people owe you, minus what you owe.
- See a history of your total with a small chart. A new point gets saved every day you change a balance.
- If the server ever sends data that's broken, the app doesn't count it. It shows it in a "Needs review" box, tells you what's wrong, and lets you fix it or delete it.

## How to run it

You need Node.js 22.12 or newer.

        npm install
        npm run dev


Then open http://localhost:5173. This starts the app and a small API (json-server) on port 3001 that saves your data in db.json. The first time you run it, it creates .env (from .env.example) and db.json (from db.example.json) for you, so you don't need to set anything up. .env holds the two API addresses: VITE_API_URL for json-server and VITE_RATES_URL for the exchange rates.

## How to use it

1. Add your accounts with + Add account (name, type, currency and how much is in it now).
2. Whenever you check your bank apps or wallet, press Update balances and type the new numbers.
3. Switch between € and $ at the top to see the total in either currency.
4. Add money people owe you (or you owe) with + Add IOU. When it's paid, press Paid and choose the account.
5. Click any account or open IOU to edit it.
6. Scroll down to History to see how your total changes over time.

## Seeing the bonus

The app checks everything it gets from the server with Zod (safeParse), one record at a time. To see it catch a broken record, run npm run dev:demo and open http://localhost:5174. The example data has a broken account called "Old piggy bank", and it shows up in the "Needs review" box instead of being counted.

## Use of AI

I used Claude (in Claude Code) as a programming partner. The idea for the app was mine, and I built with Claude step by step, but with me deciding what to add or change at each stage (for example dropping the transaction list to focus only on balances, or adding the history and IOUs). After each step I reviewed the code, asked about the parts I didn't understand, and checked with npm run dev that everything worked before committing to GitHub.

## Autopsy

1. At first the app worked like most money apps: you logged every income and expense and it calculated your balance from that. But I didn't want to track every single transaction, I just wanted to be able to see my savings and my net balance over time. So I removed the transactions and now each account simply stores how much it has, and I update it whenever I check. The other option would have shown you where your money goes, but that wasn't what I wanted for this project.

2. The app checks the data it gets from the server with Zod. At first it checked the whole list at once, so if one account had wrong data, the whole list failed and nothing showed up. I changed it to check each account separately: the good ones still show, and only the broken one goes to the "Needs review" box. Checking the whole list is simpler, but one mistake would hide all the money.