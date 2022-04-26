document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {

  // Add the current state to the history
  history.pushState({mail: 'inbox'}, "", 'compose');

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#single-view').style.display = 'none';
  document.querySelector('#reply-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';

  // listen to when the form is submitted (that is, when "the email is sent")
  document.querySelector('#compose-form').onsubmit = function() {

    // get the info from the form (recipients, subject and body)
    const recipients = document.querySelector('#compose-recipients').value;
    const subject = document.querySelector('#compose-subject').value;
    const body = document.querySelector('#compose-body').value;
    
    // send the info by POST to /emails
    fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
        recipients: recipients,
        subject: subject,
        body: body
      })
    })
    .then(response => response.json())
    .then(result => {

      // if the response is 201 ("{"message": "Email sent successfully."}"), then load the SENT mailbox
      // else, if the result is an error, handle it. Error options:
      // 1. {"error": "At least one recipient required."}
      // 2. {"error": "User with email baz@example.com does not exist."}

      if (result.message) {
        load_mailbox('sent');
      
      } else {
        if (result.error === 'At least one recipient required.') {
          alert('At least one recipient required.');
        } else {
          // else meaning result.error is 'User with email baz@example.com does not exist.', for example
          alert('The recipient(s) does not exist.');
        }
      }
      
    });

    // Stop form from submitting
    return false;
  };
}

function load_mailbox(mailbox) {

  // Add the current state to the history
  history.pushState({mail: mailbox}, "", `${mailbox}`);
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').innerHTML = '';
  document.querySelector('#single-view').style.display = 'none';
  document.querySelector('#reply-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#emails-view').style.display = 'block';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Get the emails from the appropiate mailbox:
  fetch('/emails/' + mailbox)
  .then(response => response.json())
  .then(emails => {

    // check that the reponse is not '{"error": "Invalid mailbox."}'.
    if (!emails.error) {

      if (mailbox === 'sent') {

        // organize the emails accordingly
        const titles = document.createElement('div');
        titles.classList.add('flex-container', 'titles');
        titles.innerHTML = '<div class="left font-weight-bold">To</div> <div class="center font-weight-bold">Subject</div> <div class="right font-weight-bold">Date</div>';
        document.querySelector('#emails-view').append(titles);

        emails.forEach(email => {
          const element = document.createElement('div');
          element.className = 'flex-container';
          element.innerHTML = `<div class="left">${email.recipients}</div> <div class="center">${email.subject}</div> <div class="right">${email.timestamp}</div>`;
          
          if (email.read) {
            element.classList.add('read');
          }
          else {
            element.classList.add('unread');
          }

          element.addEventListener('click', () => view_email(mailbox, email.id));

          document.querySelector('#emails-view').append(element);

        });

      } else {
        // else meaning the mailbox is either the inbox or the archived
        const titles = document.createElement('div');
        titles.classList.add('flex-container', 'titles');
        titles.innerHTML = '<div class="left font-weight-bold">From</div> <div class="center font-weight-bold">Subject</div> <div class="right font-weight-bold">Date</div>';
        document.querySelector('#emails-view').append(titles);

        emails.forEach(email => {
          const element = document.createElement('div');
          element.className = 'flex-container';
          element.innerHTML = `<div class="left">${email.sender}</div> <div class="center">${email.subject}</div> <div class="right">${email.timestamp}</div>`;
          
          if (email.read) {
            element.classList.add('read');
          }
          else {
            element.classList.add('unread');
          }
          
          element.addEventListener('click', () => view_email(mailbox, email.id));
          
          document.querySelector('#emails-view').append(element);

        });
      } // end of else     

    } else {
      // else meaning there was an error retrieving the mailbox
      document.querySelector('#mailbox-error').innerHTML = 'An error occurred retrieving the requested mailbox.'
    }
    
  });
}

function view_email(mailbox, id) {

  // Add the current state to the history
  history.pushState({mail: id}, "", `email=${id}`);

  // hide/show the appropiate divs
  document.querySelector('#single-view').innerHTML = '';
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#reply-view').style.display = 'none';
  document.querySelector('#single-view').style.display = 'block';

  // Put the email as 'read'
  fetch('/emails/' + id, {
    method: 'PUT',
    body: JSON.stringify({
        read: true
    })
  })

  // Load the email to view
  fetch('/emails/' + id)
  .then(response => response.json())
  .then(email => {

    // load the email for the user
    const from = document.createElement('div');
    from.innerHTML = `<b>From:</b> ${email.sender}`;
    document.querySelector('#single-view').append(from);

    const to = document.createElement('div');
    to.innerHTML = `<b>To:</b> ${email.recipients}`;
    document.querySelector('#single-view').append(to);

    const subject = document.createElement('div');
    subject.innerHTML = `<b>Subject:</b> ${email.subject}`;
    document.querySelector('#single-view').append(subject);

    const timestamp = document.createElement('div');
    timestamp.innerHTML = `<b>Timestamp:</b> ${email.timestamp}`;
    document.querySelector('#single-view').append(timestamp);

    // If the email is NOT on the 'sent' mailbox, add a reply button and an archive/unarchive button
    if (mailbox !== 'sent') {
      const reply = document.createElement('button');
      reply.innerHTML = 'Reply';
      reply.classList.add('btn', 'btn-sm', 'btn-primary', 'buttons');
      reply.addEventListener('click', () => reply_email(email.id));
      document.querySelector('#single-view').append(reply);

      const archive = document.createElement('button');
      if (email.archived) {
        archive.innerHTML = 'Unarchive';
      }
      else {
        archive.innerHTML = 'Archive';
      }
      archive.classList.add('btn', 'btn-sm', 'btn-primary', 'buttons');
      archive.addEventListener('click', function() {
        // if the email is archived, put it as 'unarchived' -- and viceversa on the else
        if (email.archived) {
          fetch('/emails/' + email.id, {
            method: 'PUT',
            body: JSON.stringify({
                archived: false
            })
          })
        } else {
          fetch('/emails/' + email.id, {
            method: 'PUT',
            body: JSON.stringify({
              archived: true
            })
          }) 
        }
        setTimeout(function() {
          load_mailbox('inbox');
        }, 1000);
        
      });
      document.querySelector('#single-view').append(archive);
    }

    const hr = document.createElement('hr')
    document.querySelector('#single-view').append(hr);

    const body = document.createElement('div');
    body.innerHTML = `${email.body}`;
    body.className = 'bodytext';
    document.querySelector('#single-view').append(body);

  });
}

function reply_email(id) {

  // Add the current state to the history
  history.pushState({mail: 'inbox'}, "", `reply=${id}`);

  // hide/show the appropiate divs
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#reply-view').style.display = 'block';
  document.querySelector('#single-view').style.display = 'none';

  // Load the email to reply to
  fetch('/emails/' + id)
  .then(response => response.json())
  .then(email => {

    // load the pre-populated reply form
    document.querySelector('#reply-recipients').value = `${email.sender}`;
    
    if (email.subject.substring(0,3) === 'RE:') {
      document.querySelector('#reply-subject').value = `${email.subject}`;
    } else {
      document.querySelector('#reply-subject').value = `RE: ${email.subject}`;
    }

    document.querySelector('#reply-body').value = `\n------\nOn ${email.timestamp} ${email.sender} wrote:\n${email.body}`;

    // handle the form/reply being sent
    document.querySelector('#reply-form').onsubmit = function() {

      // get the info from the form (recipients, subject and body)
      const recipients = document.querySelector('#reply-recipients').value;
      const subject = document.querySelector('#reply-subject').value;
      const body = document.querySelector('#reply-body').value;
      
      // send the info by POST to /emails
      fetch('/emails', {
        method: 'POST',
        body: JSON.stringify({
          recipients: recipients,
          subject: subject,
          body: body
        })
      })
      .then(response => response.json())
      .then(result => {
  
        // if the response is 201 ("{"message": "Email sent successfully."}"), then load the SENT mailbox
        // else, if the result is an error, handle it. Error options:
        // 1. {"error": "At least one recipient required."}
        // 2. {"error": "User with email baz@example.com does not exist."}
  
        if (result.message) {
          load_mailbox('sent');
        
        } else {
          if (result.error === 'At least one recipient required.') {
            alert('At least one recipient required.');
          } else {
            // else meaning result.error is 'User with email baz@example.com does not exist.', for example
            alert('The recipient(s) does not exist.');
          }
        }
        
      });
  
      // Stop the form from submitting
      return false;
    };
    
  }); // end of fetch

}

// When back arrow is clicked, show previous page
// note: the compose and reply forms will go back to the inbox
window.onpopstate = function(event) {
  load_mailbox(event.state.mail);
}
    