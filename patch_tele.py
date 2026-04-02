import re

path = 'vnstock-live/worker/telegram_bot.py'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update update.message -> update.effective_message
text = text.replace('update.message.reply_text', 'update.effective_message.reply_text')
text = text.replace('update.message.reply_photo', 'update.effective_message.reply_photo')

# 2. Add filters to imports
text = text.replace('ApplicationBuilder, CommandHandler, ContextTypes', 'ApplicationBuilder, CommandHandler, ContextTypes, filters')

# 3. Add filters to CommandHandler in main
old_main = '''    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("scan", cmd_scan))
    app.add_handler(CommandHandler("price", cmd_price))
    app.add_handler(CommandHandler("top", cmd_top))
    app.add_handler(CommandHandler("bot", cmd_bot_bottom))
    app.add_handler(CommandHandler("sideway", cmd_sideway))'''

new_main = '''    cmd_filters = filters.COMMAND | filters.UpdateType.CHANNEL_POST
    app.add_handler(CommandHandler("start", cmd_start, filters=cmd_filters))
    app.add_handler(CommandHandler("help", cmd_help, filters=cmd_filters))
    app.add_handler(CommandHandler("scan", cmd_scan, filters=cmd_filters))
    app.add_handler(CommandHandler("price", cmd_price, filters=cmd_filters))
    app.add_handler(CommandHandler("top", cmd_top, filters=cmd_filters))
    app.add_handler(CommandHandler("bot", cmd_bot_bottom, filters=cmd_filters))
    app.add_handler(CommandHandler("sideway", cmd_sideway, filters=cmd_filters))'''

text = text.replace(old_main, new_main)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Success fully patched bot')
